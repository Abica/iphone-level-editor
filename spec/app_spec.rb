require File.dirname( __FILE__ ) + "/spec_helper"

describe "app.rb" do
  include Rack::Test::Methods

  def app
    @app ||= Sinatra::Application
  end

  it "should respond to /" do
    get "/"
    last_response.should be_ok
  end

  %w{ levels sprite_atlases }.each do | path |
    describe "GET /#{ path }.json" do
      it "should have an application/json content type" do
        get "/#{ path }.json"
        last_response.content_type.should == "application/json"
      end

      it "should return valid json" do
        get "/#{ path }.json"
        JSON.load( last_response.body ).should be_instance_of( Hash )
      end
    end
  end

  describe "GET /main.css" do
    it "should have a text/css content type" do
      get "/main.css"
      last_response.content_type.should include( "text/css" )
    end
  end

  describe "PlistImporter" do
    before do
      @plist_path = File.dirname( __FILE__ ) + "/fixtures/sprite_atlases/aTack/coords.plist"
      @ball_key = "ball.png"
    end

    %w{ xml_from_plist load }.each do | method_name |
      describe "##{ method_name }" do
        before do
          @xml = case method_name
            when "load"
              PlistImporter.new( @plist_path ).load
            else
              PlistImporter.xml_from_plist( @plist_path )
          end
        end

        it "should return valid xml" do
          @xml.should be_instance_of( Hash )
        end

        it "should contain dimensions for a valid filename" do
          @xml[ @ball_key ].should be_instance_of( Hash )
        end

        %w{ w x y h offsetX offsetY }.each do | key |
          it "should be contain a property named #{ key }" do
            @xml[ @ball_key ].should have_key( key ) 
          end
        end
      end
    end

    describe "#flatten" do
    end
  end
end

module AssignMacro  
  module ExampleMethods  
  end  
  
  module ExampleGroupMethods  
  end  
  
  def self.included(receiver)  
    receiver.extend         ExampleGroupMethods  
    receiver.send :include, ExampleMethods  
  end  
end  
