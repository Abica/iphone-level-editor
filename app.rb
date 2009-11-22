require 'rubygems'
require 'sinatra'
require 'haml'
require 'sass'
require 'xmlsimple'
require 'json'
require 'pp'


get '/' do
  haml :index, :layout => true
end

get '/levels.json' do
  content_type :json

  levels = Dir[ "public/level_packs/*/*.json" ].inject( "" ) do | str, path |
    str + IO.read( path )
  end

  levels
end

get '/sprite_atlases.json' do
  content_type :json

  atlases = Dir[ "public/sprite_atlases/*/*.plist" ].inject( {} ) do | hsh, path |
    atlas_name = File.dirname( path )[ /\/([^\/]+)$/, 1 ]
    hsh[ atlas_name ] = PlistImporter.xml_from_plist( path )
    hsh
  end

  atlases.to_json
end

post '/import/levels' do
  # allow user to edit files
end

post '/import/textures' do
  # import a plist and an image texture
end

post '/export' do
  # save all levels to /levels
  # levels are exported as json structures
end

get '/main.css' do
  content_type 'text/css', :charset => 'utf-8'
  sass :stylesheet
end

class PlistImporter
  attr_reader :plist

  def self.xml_from_plist( plist )
    new( plist ).load
  end

  def initialize( plist )
    @plist = plist
  end

  def load
    xml = XmlSimple.xml_in( IO.read( plist ) )
    dict = xml[ "dict" ]

    dict.inject( {} ) do | hsh, item |
      hsh.update( flatten( item.dup ) )
    end
  end

  def flatten( hash )
    keys = hash[ "key" ]
    values = hash[ "dict" ] || hash[ "integer" ]

    keys.inject( {} ) do | hsh, item |
      value = values.to_a.shift
      hsh[ item ] = if value.is_a? Hash
        flatten( value )
      else
        value
      end
      hsh
    end
  end
end
