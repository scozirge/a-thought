import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, randomInt } from 'node:crypto';
import { LEVELS, STEP_MS, makeRound, makeLobby, transferToHost, initialRobot, submitProgram, advanceRound } from './public/game.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const rooms = new Map();
const COLORS = ['#5365ad', '#e9a44b', '#63a99b', '#cf7c91', '#869b58', '#9b83c4', '#679bc1'];
const cleanName = name => String(name || '').trim().slice(0, 16) || '小隊員';
const member = (name, isHost, index) => ({ id: randomBytes(8).toString('hex'), token: randomBytes(24).toString('hex'), name: cleanName(name), isHost, color: COLORS[index % COLORS.length] });
const isOnline = (room, id) => [...room.clients.values()].includes(id);
const view = room => ({ code: room.code, members: room.members.map(({ token, ...m }) => ({...m, online: isOnline(room, m.id)})), round: room.round, messages: room.messages });
function broadcast(room) {
  room.touched = Date.now();
  const data = `data: ${JSON.stringify(view(room))}\n\n`;
  for (const client of room.clients.keys()) client.write(data);
}
function startPlayback(room) {
  clearInterval(room.timer);
  room.timer = setInterval(() => {
    if (advanceRound(room.round)) broadcast(room);
    if (room.round.phase !== 'playing') clearInterval(room.timer);
  }, STEP_MS);
}
function reset(room, level = room.round.level, perPlayer = room.round.perPlayer) {
  const round = makeLobby(level, room.members.find(m => m.isHost), perPlayer, room.round.roundId + 1);
  clearInterval(room.timer); room.round = round;
}
function startRound(room) {
  const previous = room.round;
  const participants = room.members.filter(m => m.isHost || isOnline(room, m.id));
  room.round = makeRound(previous.level, participants, previous.perPlayer, previous.roundId + 1);
  room.round.message = participants.length === 1 ? '全部步驟由你完成，排好指令就出發。' : `本題 ${participants.length} 人接力。晚加入的隊員下題參加。`;
}
async function body(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 16384) throw new Error('資料太長了。');
  }
  return JSON.parse(text || '{}');
}
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
function auth(code, token) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new Error('找不到這個房間。請確認房號，或請老師重新開房。');
  const player = room.members.find(m => m.token === token);
  if (!player) throw new Error('加入資訊已失效，請重新加入房間。');
  return { room, player };
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/api/events' && req.method === 'GET') {
        const { room, player } = auth(url.searchParams.get('room'), url.searchParams.get('token'));
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        room.clients.set(res, player.id); broadcast(room);
        const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
        req.on('close', () => { clearInterval(heartbeat); if (room.clients.delete(res)) broadcast(room); });
        return;
      }
      if (url.pathname === '/api/network' && req.method === 'GET') {
        const addresses = Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);
        return json(res, 200, { addresses });
      }
      if (url.pathname.startsWith('/api/') && req.method === 'POST') {
        // Only same-origin browser writes; this local demo has no public accounts.
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: '請從遊戲頁面操作。' });
        const data = await body(req);
        if (url.pathname === '/api/create') {
          if (rooms.size >= 100) throw new Error('房間已滿，請稍後再試。');
          let code; do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
          const host = member(data.name || '老師', true, 0);
          const room = { code, members: [host], round: makeLobby(LEVELS[0], host), clients: new Map(), messages: [], touched: Date.now() };
          rooms.set(code, room);
          return json(res, 200, { token: host.token, playerId: host.id, state: view(room) });
        }
        if (url.pathname === '/api/join') {
          const room = rooms.get(String(data.code || '').toUpperCase());
          if (!room) throw new Error('找不到房間，請確認老師的六位房號。');
          if (room.members.length >= 7) throw new Error('這個房間已經有 6 位隊員了。');
          const player = member(data.name, false, room.members.length);
          room.members.push(player);
          broadcast(room);
          return json(res, 200, { token: player.token, playerId: player.id, state: view(room) });
        }
        const { room, player } = auth(data.code, data.token);
        if (url.pathname === '/api/session') return json(res, 200, { state: view(room), playerId: player.id });
        if (url.pathname === '/api/submit') {
          if (submitProgram(room.round, player.id, data.commands, data.roundId)) startPlayback(room);
        } else if (url.pathname === '/api/message') {
          const text = String(data.text || '').trim().slice(0, 120);
          if (!text) throw new Error('先寫一句話吧。');
          room.messages.push({ id: randomBytes(6).toString('hex'), name: player.name, color: player.color, text });
          room.messages = room.messages.slice(-30);
        } else {
          if (!player.isHost) return json(res, 403, { error: '這個操作交給老師。' });
          if (url.pathname === '/api/start') {
            if (room.round.phase !== 'lobby') throw new Error('本題已經開始，請先準備下一題。');
            if (data.roundId !== room.round.roundId) throw new Error('題目已更新，請確認畫面後再開始。');
            startRound(room);
          } else if (url.pathname === '/api/retry') {
            if (room.round.phase !== 'result' || data.roundId !== room.round.roundId) throw new Error('請等本題結束後再重試。');
            clearInterval(room.timer);
            startRound(room);
          } else if (url.pathname === '/api/round') {
            const level = data.level || room.round.level;
            reset(room, level, data.perPlayer ?? room.round.perPlayer);
          } else if (url.pathname === '/api/pause') {
            if (room.round.phase !== 'playing') throw new Error('目前沒有正在播放的任務。');
            room.round.paused = !room.round.paused;
          } else if (url.pathname === '/api/replay') {
            if (room.round.phase !== 'result' || !room.round.success) throw new Error('成功通關後才能重播；失敗的指令已清空。');
            room.round.robot = initialRobot(room.round.level);
            room.round.playIndex = -1; room.round.phase = 'playing'; room.round.success = false; room.round.paused = false;
            room.round.message = '再看一次大家的指令。'; startPlayback(room);
          } else if (url.pathname === '/api/remove') {
            if (data.playerId === player.id || !room.members.some(m => m.id === data.playerId)) throw new Error('無法移除這位隊員。');
            room.members = room.members.filter(m => m.id !== data.playerId);
            transferToHost(room.round, data.playerId, player.id);
            for (const [client, id] of room.clients) if (id === data.playerId) {
              room.clients.delete(client);
              client.write('event: removed\ndata: {"message":"你已被房主移出房間。"}\n\n');
              client.end();
            }
          } else return json(res, 404, { error: '找不到這個操作。' });
        }
        broadcast(room); return json(res, 200, { state: view(room) });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: '不支援這個操作。' });
      const allowed = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/app.js', 'app.js'], ['/game.js', 'game.js'], ['/style.css', 'style.css'], ['/favicon.svg', 'favicon.svg']]);
      const file = allowed.get(url.pathname);
      if (!file) { res.writeHead(404); return res.end('Not found'); }
      const buffer = await readFile(path.join(ROOT, file));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : buffer);
    } catch (error) { if (!res.headersSent) json(res, 400, { error: error.message || '操作沒有成功，請再試一次。' }); else res.end(); }
  });
}

const cleanup = setInterval(() => {
  for (const [code, room] of rooms) if (!room.clients.size && Date.now() - room.touched > 4 * 60 * 60 * 1000) { clearInterval(room.timer); rooms.delete(code); }
}, 60000);
cleanup.unref();

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4317);
  const server = createServer();
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `連接埠 ${port} 已在使用中，請設定另一個 PORT。` : error); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => {
    console.log(`傻瓜勇者已啟動：http://localhost:${port}`);
    for (const n of Object.values(os.networkInterfaces()).flat()) if (n && n.family === 'IPv4' && !n.internal) console.log(`同一區網可加入：http://${n.address}:${port}`);
  });
}
