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
$userID_K=$_POST['userID_K'];
//如果server端判斷資料庫中沒此userID_K的玩家資料就新增資料並把本地送來的資料(以下)新增到DB
$star=$_POST['star'];
$ownStarFeature=$_POST['ownStarFeature'];
$maxKill=$_POST['maxKill'];
$ownGeneralClamor=$_POST['ownGeneralClamor'];
$winningStreak=$_POST['winningStreak'];
$payKreds=0;
$clamorsStr="";
//找尋Kongergate UserID
$conn = mysqli_connect($db_host_load,$db_user,$db_pass) or ("Fail:連線DB失敗:"  . mysqli_error());
if (!$conn)
	die('Fail:連線DB失敗:' . mysqli_error());

$check = mysqli_query($conn,"SELECT * FROM ".$db_name.".PlayerAccount WHERE `userID_K`=".$userID_K);
if (!$check) {
    //計算執行時間
    $time_end = microtime(true);
    $executeTime = $time_end - $time_start;
	die ("Fail:找玩家資料出錯:".mysqli_error($conn).": \nExecuteTime=".$executeTime."");
}
$numrows = mysqli_num_rows($check);

if ($numrows == 0)//找不到已經存在的Kongregate帳號就創新帳號並把本地送來的資料(以下)新增到DB
{
	//寫入資料庫
    $writeData = mysqli_query($conn,"INSERT INTO  ".$db_name.".PlayerAccount (  `ac_K` ,`userID_K`,`payKreds` ,`star`,`ownStarFeature` ,`maxKill`,`ownGeneralClamor`,`winningStreak` ) VALUES ( '".$ac_K."','".$userID_K."','".$payKreds."','".$star."','".$ownStarFeature."','".$maxKill."','".$ownGeneralClamor."','".$winningStreak."') ; ");
	//取得剛新增的資料流水號
	$id=mysqli_insert_id($conn);
	if ($writeData)
	{
		//計算執行時間
		$time_end = microtime(true);
		$executeTime = $time_end - $time_start;
		//送回client
		die("Success:".$id.",".$payKreds.",".$star.",".$ownStarFeature.",".$maxKill.",".$ownGeneralClamor.",".$clamorsStr.",".$winningStreak.": \nExecuteTime=".$executeTime);
	}
	else
	{
		WriteLastMysqlError($ac_K,"新創帳號失敗");
		$time_end = microtime(true);
		$executeTime = $time_end - $time_start;
		die ("Fail:新創帳號失敗: \nExecuteTime=".$executeTime."");
	}
}
else//找到Kongregate帳戶就進行登入
{
	while($row = mysqli_fetch_assoc($check))
	{
		$id=$row['id'];
		$payKreds=$row['payKreds'];
		$star=$row['star'];
		$ownStarFeature=$row['ownStarFeature'];
		$maxKill=$row['maxKill'];
		$ownGeneralClamor=$row['ownGeneralClamor'];
		$winningStreak=$row['winningStreak'];
	}
	$getClamors = mysqli_query($conn,"SELECT * FROM ".$db_name.".Clamor WHERE `id`=".$id);
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
			die("Success:".$id.",".$payKreds.",".$star.",".$ownStarFeature.",".$maxKill.",".$ownGeneralClamor.",".$clamorsStr.",".$winningStreak.": \nExecuteTime=".$executeTime);
		}
		else
		{
			//計算執行時間
			$time_end = microtime(true);
			$executeTime = $time_end - $time_start;
			//送回client
			die("Success:".$id.",".$payKreds.",".$star.",".$ownStarFeature.",".$maxKill.",".$ownGeneralClamor.",".$clamorsStr.",".$winningStreak.": \nExecuteTime=".$executeTime);
		}
	}
	else
	{
		WriteLastMysqlError($ac_K,"登入時取喊話資料失敗");
		$time_end = microtime(true);
		$executeTime = $time_end - $time_start;
		die ("Fail:新創帳號失敗: \nExecuteTime=".$executeTime."");
	}
}


?>