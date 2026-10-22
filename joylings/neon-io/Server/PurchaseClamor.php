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
$payKreds=$_POST['payKreds'];
$star=$_POST['star'];
$ownGeneralClamor=$_POST['ownGeneralClamor'];
$KGPurchase=$_POST['KGPurchase'];


//找尋Kongergate UserID
$conn = mysqli_connect($db_host_load,$db_user,$db_pass) or ("Fail:連線DB失敗:"  . mysqli_error());
if (!$conn)
	die('Fail:連線DB失敗:' . mysqli_error());

//寫入資料庫
$writeACData = mysqli_query($conn,"UPDATE ".$db_name.".PlayerAccount SET `star` = '".$star."', `payKreds` = '".$payKreds."', `ownGeneralClamor` = '".$ownGeneralClamor."' WHERE `id` = '".$dbID."'");
if ($writeACData)
{
	if($KGPurchase==1)
		WritePurchaseLog($ac_K,"消費購買Clamor");
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die("Success:: \nExecuteTime=".$executeTime);
}
else
{
	WriteLastMysqlError($ac_K,"購買Clamor時寫入資料失敗");
	$time_end = microtime(true);
	$executeTime = $time_end - $time_start;
	die ("Fail:購買Clamor時寫入資料失敗: \nExecuteTime=".$executeTime."");
}
?>