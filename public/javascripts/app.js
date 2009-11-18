function Point( x, y ) {
  this.x = x;
  this.y = y;
  return this;
}

function Size( width, height ) {
  this.height = height;
  this.width = width;
  return this;
}

function Sprite( image, x, y, width, height ) {
  this.image = image;
  this.position = new Point( x, y );
  this.dimensions = new Size( width, height );
  this.create();
}

Sprite.prototype = {
  create: function() {
    this.element = $( "<div />" ); 
    this.element.data( "dimensions", this.dimensions );
    this.element.data( "position", this.position );

    this.element.css( {
      width: this.dimensions.width,
      height: this.dimensions.height,
      background: "url(" + this.image + ") ",
      "background-position": -this.position.x + "px " + this.position.y + "px"
    } );

    return this;
  },

  clone: function() {
    return new Sprite( this.image, this.position.x, this.position.y, this.dimensions.width, this.dimensions.height );
  }
}

var AtlasManager = {
  atlas_packs: {},
  load: function() {
    var context = this;
    $.getJSON( "/sprite_atlases.json", function( data ) {
      context.atlas_packs = data;
      context.build_menu();
    } );
  },

  build_menu: function() {
    $.each( this.atlas_packs, function( bundle_name, images ) {
      var div = $( "<div id='" + bundle_name + "-atlas-pack'/>" );
      div.append( $( "<h2>" + bundle_name + "</h2>" ) );

      $.each( images, function( image_name, attrs ) {
        var path = 'sprite_atlases/' + bundle_name + '/texture.png';
        var sprite = new Sprite( path, attrs.x, attrs.y, attrs.w+ "px", attrs.h + "px");
        div.append( sprite.element );
      } );

      $( "#textures" ).append( div ) 
    } );

    $( "#textures div div" ).draggable( { revert: true, helper: 'clone' } );
  }
}

var app = $.sammy( function() {
  this.get( "#/flip", function( context ) {
    var width = $( "#iphone" ).width();
    var height = $( "#iphone" ).height();
  
    $( "#iphone" ).width( height );
    $( "#iphone" ).height( width );
    this.redirect( '#/' );
  } );
} );

$( function() {
  app.run( '#/' );
  AtlasManager.load();
  $( "#iphone" ).droppable( {
    drop: function( event, ui ) {
      if ( !ui.draggable.data( "onBoard" ) ) {
        var dimensions = ui.draggable.data( "dimensions" );
        var position = ui.draggable.data( "position" );
        var sprite = new Sprite( "sprite_atlases/splat/texture.png", position.x, position.y, dimensions.width, dimensions.height );

        sprite.element.draggable({ containment: 'parent'});
        $( "#iphone" ).append( sprite.element );

        sprite.element.css( {
          position: "absolute",
          left: ui.position.left + "px",
          top: ui.position.top + "px"
        } );

        sprite.element.data( "onBoard", true );
      } else {
        ui.draggable.css( {
          left: ui.position.left + "px",
          top: ui.position.top + "px"
        } );
      }
    }
  } );
} );
