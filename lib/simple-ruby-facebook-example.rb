APP_ROOT = File.expand_path(File.join(File.dirname(__FILE__), '..'))

require 'rubygems'
require 'sinatra'
require 'net/http'
require 'rest-client'
require 'json'
require 'haml'

DB = "#{ENV['CLOUDANT_URL']}/jdata"

class SimpleRubyFacebookExample < Sinatra::Application

  set :root, APP_ROOT
  enable :sessions


  get '/' do
    redirect '/index.html'
  end

  get '/jdata/:doc' do
    RestClient.get("#{DB}/#{params[:doc]}") { |response, request, result|
      case response.code
      when 200, 201, 202
        "It worked !"
        response
      else
        halt response.code, "pass thru '%s'<br> '%s'!" % [response.code, response.body] 
      end
    }
  end

  put '/jdata/*/*' do | doc, args |
    "put to #{DB}/#{doc}?#{args}"
    request.body.rewind
    data = request.body.read
    if (args.nil?)
      path = "#{DB}/#{doc}"
    else 
      path = "#{DB}/#{doc}?_rev=#{args}"
    end
    doc = RestClient.put(path, data) { |dbresponse, dbrequest, dbresult|
      case dbresponse.code
      when 200, 201, 202
        dbresponse
      else
        halt dbresponse.code, "post to #{path} [#{data}] - pass thru '#{dbresponse.code}'<br> '#{dbresponse.body}'!" 
      end
    }
  end

  post '/jdata/*/*' do | doc, args|
    "post to #{DB}/#{doc}?#{args}"
    request.body.rewind
    data = request.body.read
    if (args.nil?)
      path = "#{DB}/#{doc}"
    else
      path = "#{DB}/#{doc}?_rev=#{args}"
    end
    doc = RestClient.put(path, data) { |dbresponse, dbrequest, dbresult|
      case dbresponse.code
      when 200, 201, 202
        dbresponse
      else
        request.body.rewind
        halt dbresponse.code, "post to #{path} [#{data}] - pass thru '#{dbresponse.code}'<br> '#{dbresponse.body}'!" 
      end
    }
  end

  delete '/jdata/*/*' do | doc, args|
    "delete to #{DB}/#{doc}?#{args}"
    doc = RestClient.delete("#{DB}/#{doc}?rev=#{args}") { |dbresponse, dbrequest, dbresult|
      case dbresponse.code
      when 200, 201, 202
        dbresponse
      else
        request.body.rewind
        halt dbresponse.code, "delete to #{DB}/#{doc}?_rev=#{args} - pass thru '%s'<br> '%s'!" % [dbresponse.code, dbresponse.body] 
      end
    }
  end

  get '/doc/:doc' do
    if session['access_token']
        RestClient.get("#{DB}/#{params[:doc]}") { |dbresponse, dbrequest, dbresult|
          case dbresponse.code
          when 200, 201, 202
            dbresponse
          else
            halt dbresponse.code, "pass thru '%s'!" % [dbresponse.code] 
          end
        }
    else
        halt 401, "Unauthorized"
    end
  end
  
  put '/doc/:doc' do
    if session['access_token']
      doc = RestClient.put("#{DB}/#{params[:doc]}", '{"put": true}') { |dbresponse, dbrequest, dbresult|
        case dbresponse.code
        when 200, 201, 202
          dbresponse
        else
          halt dbresponse.code, "pass thru '%s'!" % [dbresponse.code] 
        end
      }
    else
      halt 401, "Unauthorized"
    end
  end

end
