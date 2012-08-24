class APIProxy < Sinatra::Base
API_KEY = "E1MWo6Boqq_S9PrsnZteUoe2X4qK.Zi4rW"
API_SECRET = "MSm5wS9oDVsnnIoaQAt5FNtvlNCiQ1wMMEOQ2iyA"

  get '/' do
    send_file File.join(settings.public_folder, 'index.html')
  end

  post '/api_proxy' do
    request_params = JSON.parse(URI.unescape(params[:query_params])) rescue {}
    body = URI.unescape(params[:body])
    path = "/v2/#{params[:path]}"
    api = Ooyala::API.new API_KEY, API_SECRET

    case params[:method].downcase
      when 'post' then api.post(path, request_params, body)
      when 'get' then api.get(path, request_params)
      when 'put' then api.put(path, request_params, body)
      when 'patch' then api.path(path, request_params, body)
      when 'delete' then api.delete(path, request_params)
      else halt 400
    end
  end
end
