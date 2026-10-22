<?PHP
$time_start = microtime(true);
//導入config
require_once('./config.php');
//導入加密類
//require_once('./3DES.php');
//導入Writer
require_once('./Writer.php');
//取得建立帳戶時間，格式為年份/月/日 時:分:秒(台北時區)
date_default_timezone_set('Asia/Taipei');
$signUpTime= date("Y/m/d H:i:s");
//接收資料
$ac_K=$_POST['ac_K'];
$clamorsStr="";
//找尋Kongergate UserID
$conn = mysqli_connect($db_host_load,$db_user,$db_pass) or ("Fail:連線DB失敗:"  . mysqli_error());
if (!$conn)
	die('Fail:連線DB失敗:' . mysqli_error());

$getClamors = mysqli_query($conn,"SELECT * FROM ".$db_name.".Clamor WHERE `ac_K`='".$ac_K."'");
if($getClamors)
{
	$numrows = mysqli_num_rows($getClamors);
	if($numrows!=0)
	{
		while($row = mysqli_fetch_assoc($getClamors))
		{
			if($clamorsStr!="")
				$clamorsStr.="/";
			$triggerID=$row['triggerID'];
			$content=$row['content'];
			$clamorsStr.=$triggerID."-".$content;
		}
		//計算執行時間
		$time_end = microtime(true);
		$executeTime = $time_end - $time_start;
		//送回client
		die("Success:".$ac_K.",".$clamorsStr.": \nExecuteTime=".$executeTime);
	}
	else
	{
		//計算執行時間
		$time_end = microtime(true);
		$executeTime = $time_end - $time_start;
		//送回client
		die("Success:: \nExecuteTime=".$executeTime);
	}
}
else
{
	WriteLastMysqlError($ac_K,"取其他玩家喊話資料失敗");
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die ("Fail:取得喊話資料失敗: \nExecuteTime=".$executeTime."");
}


?>