// represents a point in 2d space
function Point( x, y ) {
  this.x = x;
  this.y = y;
  return this;
}

// represents the size of a rectangle
function Size( width, height ) {
  this.height = height;
  this.width = width;
  return this;
}

// handles basic creation of a css sprite from a texture
function Sprite( bundle_name, x, y, width, height ) {
  this.bundle_name = bundle_name;
  this.position = new Point( x, y );
  this.dimensions = new Size( width, height );
  this.create();
}

Sprite.prototype = {
  // create a css sprite and add it into the dom 
  create: function() {
    this.element = $( '<div />' ); 
    this.element.data( 'metadata', {
      dimensions:  this.dimensions,
      position:    this.position,
      bundle_name: this.bundle_name
    } );

    this.element.css( {
      width: this.dimensions.width,
      height: this.dimensions.height,
      background: 'url(sprite_atlases/' + this.bundle_name + '/texture.png)',
      'background-position': -this.position.x + 'px ' + this.position.y + 'px'
    } );

    return this;
  },

  // clone the current sprite
  clone: function() {
    return new Sprite( this.bundle_name, this.position.x, this.position.y, this.dimensions.width, this.dimensions.height );
  }
}

var AtlasManager = {
  // container for parsed sprite atlases
  atlas_packs: {},

  // hit the server and fetch an updated list of available sprite atlases
  load: function() {
    var context = this;
    $.getJSON( '/sprite_atlases.json', function( data ) {
      context.clearMenu();
      context.atlas_packs = data;
      context.buildMenu();
    } );
  },

  // removes all elements from the sprite atlas menu
  clearMenu: function() {
    $( '#textures div' ).remove();
  },

  // generates a menu with all available sprite atlases
  buildMenu: function() {
    $.each( this.atlas_packs, function( bundle_name, images ) {
      var div = $( '<div />' ).attr( 'id', bundle_name );
      div.append( $( '<h2 />' ).text( bundle_name ) );

      $.each( images, function( image_name, attrs ) {
        var sprite = new Sprite( bundle_name, attrs.x, attrs.y, attrs.w + 'px', attrs.h + 'px' );
        div.append( sprite.element );
      } );

      $( '#textures' ).append( div );
    } );

    $( '#textures div div' ).draggable( { helper: 'clone' } );
  }
}

// returns a point relative to the the position of target
function pointRelativeTo( position, target ) {
  var iphone_position = target.position(); 
  var x = position.left - iphone_position.left;
  var y = position.top - iphone_position.top;
  return new Point( x, y );
}

var spriteEventHandlers = {
  // setup and show attributes pane when a sprite is touched
  mousedown: function() {
    var sprite = $( this );
    var position = pointRelativeTo( sprite.position(), $( '#iphone' ) );

    $( '#iphone div' ).removeClass( 'selected' );
    sprite.addClass( 'selected' );

    $( '#sprite #position #x' ).text( parseInt( position.x ) );
    $( '#sprite #position #y' ).text( parseInt( position.y ) );

    $( '#sprite input' ).each( function() {
      var target = $( this );
      var value = $( '#iphone .selected' ).data( target.attr( 'id' ) );
      target.val( value || '' );
    } );

    $( '#sprite' ).show();
  }
}

// setup interface routing
var app = $.sammy( function() {
  // toggles the iphone canvas between landscape and portrait
  this.get( '#/flip', function( context ) {
    var width = $( '#iphone' ).width();
    var height = $( '#iphone' ).height();
  
    $( '#iphone' ).width( height );
    $( '#iphone' ).height( width );
    this.redirect( '#/' );
  } );

  // close the sprite attribute pane
  this.get( '#/close', function( context ) {
    $( '#sprite' ).hide();
    this.redirect( '#/' );
  } );

  // move the selected sprite by :amount
  this.get( '#/move-layer/:amount', function( context ) {
    var sprite = $( '#iphone .selected' );
    var z = parseInt( sprite.css( 'z-index' ) );
    z = isNaN( z ) ? 0 : z;

    switch ( this.params[ 'amount' ] ) {
      case "bottom":
        z = 0;
        break;
      case "top":
        z = 10;
        break;
      case "-1":
        z--;
        break;
      default:
        z++;
    }

    if ( z < 1 ) {
      sprite.css( 'z-index', 0 ); 
      sprite.fadeTo( 500, 0.3 );

    } else {
      sprite.css( 'z-index', z ); 
      sprite.fadeTo( 500, 1 );
    }
    this.redirect( '#/' );
  } );

  // remove currently selected sprite from the iphone canvas
  this.get( '#/delete', function( context ) {
    $( '#sprite' ).hide();
    $( '#iphone div.selected' ).remove();
    this.redirect( '#/' );
  } );
} );


$( function() {
  app.run( '#/' );
  AtlasManager.load();
  $( '#sprite' ).hide();
  $( '#tag, #z' ).blur( function() {
    var target = $( this );
    $( '#iphone .selected' ).data( target.attr( 'id' ), target.val() );
  } );

  $( '#iphone' ).ColorPicker( {
    color: '#0000ff',
    onShow: function( picker ) {
      $( picker ).fadeIn( 500 );
      return false;
    },
    onHide: function( picker ) {
      $( picker ).fadeOut( 500 );
      return false;
    },
    onChange: function( hsb, hex, rgb ) {
      $( '#iphone' ).css( 'backgroundColor', '#' + hex );
    }
  } );

  $( '#iphone' ).droppable( {
    drop: function( event, ui ) {

      // we're dropping a new object onto the iphone canvas
      if ( !ui.draggable.data( 'onBoard' ) ) {
        var metadata = ui.draggable.data( 'metadata' );
        var sprite = new Sprite(
          metadata.bundle_name,
          metadata.position.x,
          metadata.position.y,
          metadata.dimensions.width,
          metadata.dimensions.height
        );

        sprite.element.draggable( { containment: 'parent' } );
        $( '#iphone' ).append( sprite.element );

        sprite.element.css( {
          position: 'absolute',
          left: ui.position.left + 'px',
          top: ui.position.top + 'px'
        } );

        sprite.element.data( 'onBoard', true );
        sprite.element.mousedown( spriteEventHandlers.mousedown );
        sprite.element.mousedown();

      // this object has already been dropped on the iphone canvas 
      } else {
        ui.draggable.css( {
          left: ui.position.left + 'px',
          top: ui.position.top + 'px'
        } );
        ui.draggable.mousedown();
      }
    }
  } );
} );
