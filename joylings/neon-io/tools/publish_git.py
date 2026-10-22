"""Publish to the two existing classroom repos using the user's cached GitHub login.

Credential.useHttpPath is enabled locally, so the course repo has no separate
login entry. Reuse the a-thought credential in process memory only; never print
or save it, and restrict this helper to the two authorized publication targets.
"""
import argparse
import base64
import os
import subprocess

parser=argparse.ArgumentParser()
parser.add_argument('target',choices=['game','classroom'])
parser.add_argument('--dry-run',action='store_true')
args=parser.parse_args()
repo,remote,branch = ('E:/Projects/a-thought-publish-learning','https://github.com/scozirge/a-thought.git','gh-pages') if args.target=='game' else ('E:/Projects/a-thought-classroom-publish','https://github.com/scozirge/scozirge.github.io.git','main')
assert subprocess.check_output(['git','-C',repo,'remote','get-url','origin'],text=True).strip()==remote
env={**os.environ,'GCM_INTERACTIVE':'never','GIT_TERMINAL_PROMPT':'0'}
result=subprocess.run(['git','-C','E:/Projects/a-thought','credential','fill'],input='protocol=https\nhost=github.com\npath=scozirge/a-thought.git\n\n',text=True,capture_output=True,env=env,check=True)
credential=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
authorization=base64.b64encode((credential['username']+':'+credential['password']).encode()).decode()
env.update({'GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'http.https://github.com/.extraheader','GIT_CONFIG_VALUE_0':'Authorization: Basic '+authorization})
cmd=['git','-C',repo,'push']+(['--dry-run'] if args.dry_run else [])+['origin','HEAD:'+branch]
raise SystemExit(subprocess.run(cmd,env=env).returncode)
