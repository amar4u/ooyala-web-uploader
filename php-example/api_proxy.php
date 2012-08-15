<?php
require 'OoyalaApi.php';

$api = new OoyalaApi("E1MWo6Boqq_S9PrsnZteUoe2X4qK.Zi4rW","MSm5wS9oDVsnnIoaQAt5FNtvlNCiQ1wMMEOQ2iyA");

$method = $_POST["method"];
$parameters = json_decode($_POST["query_params"]);
if($parameters == null){
  $parameters = array();
}
$body = json_decode($_POST["body"]);

$path = $_POST["path"];

try{
  switch($method){
    case "GET": 
      echo json_encode($api->get($path, $parameters));
      break;
    case "POST": 
      echo json_encode($api->post($path, $body, $parameters));
      break;
    case "PUT": 
      echo json_encode($api->put($path, $body, $parameters));
      break;
    case "PACTH": 
      echo json_encode($api->patch($path, $body ,$parameters));
      break;
    case "DELETE": 
      echo json_encode($api->delete($path));
      break;
    default:
      echo "";
  }
}
catch(Exception $e){
  header("Status: 500 Internal Server Error");
  echo $e->getMessage();
}
?>
