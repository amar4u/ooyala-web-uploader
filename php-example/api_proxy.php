<?php
require 'OoyalaApi.php';

/**
 * Place your API keys from the Ooyala backlot here. It is highly recommended
 * that this example not be used on a publicly accesible web server, as any
 * user who can access this example will be able to upload assets to your
 * backlot account.
 */
define("OOYALA_API_KEY", "");
define("OOYALA_API_SECRET", "");

$api = new OoyalaApi(OOYALA_API_KEY, OOYALA_API_SECRET);

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
    case "PATCH":
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
