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
$dbID=$_POST['dbID'];
$ac_K=$_POST['ac_K'];
$triggerIDs=$_POST['triggerIDs'];
$contents=$_POST['contents'];

if($triggerIDs=="")
{
	//計算執行時間
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die("Success:: \nExecuteTime=".$executeTime);
}

$triggerIDArray=explode(",",$triggerIDs);
$contentArray=explode(",",$contents);

//找尋Kongergate UserID
$conn = mysqli_connect($db_host_load,$db_user,$db_pass) or ("Fail:連線DB失敗:"  . mysqli_error());
if (!$conn)
	die('Fail:連線DB失敗:' . mysqli_error());

$query="";
for ( $i=0 ; $i<count($triggerIDArray) ; $i++ ) {
	
	$query .= "INSERT INTO ".$db_name.".Clamor (`id`,`ac_K`,`triggerID` ,`content` )
	 VALUES ('".$dbID."','".$ac_K."','".$triggerIDArray[$i]."','".$contentArray[$i]."')
	 ON DUPLICATE KEY UPDATE
	 content = values(content);";
}
$updateClamorData=mysqli_query($conn,$query);
if($updateClamorData)
{
	//計算執行時間
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die("Success:: \nExecuteTime=".$executeTime);
}
else
{
	WriteLastMysqlError($ac_K,"更新Clamor資料出錯");
	//計算執行時間
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die("Fail:更新Clamor資料出錯: \nExecuteTime=".$executeTime);
}

?>