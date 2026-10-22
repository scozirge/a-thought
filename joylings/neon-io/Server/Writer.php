<?php

function WriteLastMysqlError($playerID,$action) {
	$now= date("Y/m/d H:i:s");
	$today=date("Ymd");
	$textWriter = fopen(dirname(__FILE__)."/ErrorLog/".$today.".txt", 'a');
	$errorStr=$now."     PlayerID:".$playerID."     Action:".$action."     Log:".mysql_errno() . ":" . mysql_error() . "\n";
	fwrite($textWriter, $errorStr);
	fclose($textWriter);
}

function WritePurchaseLog($playerID,$action) {
	$now= date("Y/m/d H:i:s");
	$today=date("Ymd");
	$textWriter = fopen(dirname(__FILE__)."/PurchaseLog/".$today.".txt", 'a');
	$purchaseStr=$now."     PlayerID:".$playerID."     Action:".$action."\n";
	fwrite($textWriter, $purchaseStr);
	fclose($textWriter);
}

?>