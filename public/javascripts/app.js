// represents a point in 2d space
function Point( x, y ) {
  this.x = parseInt( x );
  this.y = parseInt( y );
  return this;
}

// represents the size of a rectangle
function Size( width, height ) {
  this.height = height;
  this.width = width;
  return this;
}

// returns a point representing target's position with margins added
//
// this is mainly used to get around firefox treating auto margins as 0 for
// centered objects where (margin: 0 auto) will return a css position of 0px in jquery,
// whereas in safari it will return the position relative to the parent's edges
//
// that is,
//
// given
//   #element { margin: 0 auto; }
//
//
// in safari
// $( '#element' ).position().left == left
// $( '#element' ).css( 'margin-left' ) == 145px
//
// in firefox
// $( '#element' ).position().left == left + margin-left
// $( '#element' ).css( 'margin-left' ) == 0px
function targetPositionWithMargin( target ) {
  return new Point(
    target.position().left + parseInt( target.css( 'margin-left' ) ),
    target.position().top + parseInt( target.css( 'margin-top' ) )
  );
}

// returns a point relative to the the position of target
function subtractPositionFromTarget( position, target ) {
  var target_position = targetPositionWithMargin( target );
  var x = ( position.left || position.x ) - target_position.x;
  var y = ( position.top  || position.y ) - target_position.y;
  return new Point( x, y );
}

function addPositionToTarget( position, target ) {
  var target_position = targetPositionWithMargin( target );
  var x = ( position.left || position.x ) + target_position.x;
  var y = ( position.top  || position.y ) + target_position.y;
  return new Point( x, y );
}

// handles basic creation of a css sprite from a texture
var Sprite = function( bundle_name, x, y, width, height ) {
  this.bundle_name = bundle_name;
  this.position = new Point( x, y );
  this.dimensions = new Size( width, height );
  this.create();
}

Sprite.prototype = {
  // create a css sprite and add it into the dom
  create: function() {
    this.element = $( '<div />' );
    this.setMetadata( {
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

  // get the metatadata for this object
  metadata: function() {
    return this.element.data( 'metadata' );
  },

  // set the metadata for this object
  setMetadata: function( values ) {
    this.element.data( 'metadata', values );
    return this.metadata();
  },

  // clone the current sprite
  clone: function() {
    return new Sprite( this.bundle_name, this.position.x, this.position.y, this.dimensions.width, this.dimensions.height );
  }
}

var LevelManager = {
  // container for parsed levels
  level_packs: {},
  current_level: null,
  tree: null,

  packageInfo: function( id ) {
    return id.match( /(\w+)-(\w+)-\w+$/ ).slice( 1, 3 );
  },

  load: function() {
    var context = this;
    $.getJSON( '/levels.json', function( data ) {
      context.clearMenu();
      context.level_packs = data;
      context.buildMenu();
    } );
  },

  removeLevelPackById: function( id ) {
    return this.removeLevelPack( this.packageInfo( id )[ 0 ] ); 
  },

  removeLevelPack: function( bundle_name ) {
    return delete this.level_packs[ bundle_name ];
  },

  removeLevelById: function( id ) {
    return this.removeLevel.apply( this, this.packageInfo( id ) ); 
  },

  removeLevel: function( bundle_name, level_name ) {
    return this.level_packs[ bundle_name ] && delete this.level_packs[ bundle_name ][ level_name ];
  },

  levelFor: function( bundle_name, level_name ) {
    return this.level_packs[ bundle_name ] && this.level_packs[ bundle_name ][ level_name ];
  },

  loadLevel: function( level_pack, level_name ) {
    var level = this.levelFor( level_pack, level_name );
    if ( level ) {
      $.each( level.actors, function( index, attrs ) {
        var sprite = AtlasManager.spriteFor( attrs.bundle_name, attrs.image_name );
        if ( sprite ) {

          sprite.element.data( 'onBoard', true );
          sprite.setMetadata( {
            tag:         attrs.tag,
            z:           attrs.z,
            dimensions:  sprite.dimensions,
            position:    sprite.position,
            bundle_name: sprite.bundle_name
          } );

          var position = addPositionToTarget( new Point( attrs.x, attrs.y ), $( '#iphone' ) );
          sprite.element.draggable( { containment: 'parent' } );
          sprite.element.mousedown( spriteEventHandlers.mousedown );

          // FIXME: this should rotate the phone but for some reason doesn't..
          //        it appears the sammy route is not getting called as I'd expect
          if ( !$( '#iphone-case' ).hasClass( level.orientation ) ) {
            $( '<a />' ).attr( 'href', '#/flip' ).click();
          }

          sprite.element.css( {
            position: 'absolute',
            left: position.x + 'px',
            top: position.y + 'px',
            'z-index': attrs.z
          } );

          $( '#iphone' ).append( sprite.element );
        } else {
          alert( 'could not load ' + attrs.bundle_name + '/' + attrs.image_name );
          return false;
        }
      } );
      return true;
    }
    return false;
  },

  isActive: function() {
    return $( '#iphone div' ).length > 0;
  },

  isEmpty: function() {
    return !this.isActive();
  },

  newLevel: function() {
    this.clearLevel();
  },

  saveLevel: function() {
  },

  clearLevel: function() {
    $( '#iphone div' ).remove();
  },

  // removes all elements from the level packs menu
  clearMenu: function() {
    $( '#levels div' ).remove();
  },

  // generates a menu with all available level packs
  buildMenu: function() {
    $.each( this.level_packs, function( bundle_name, levels ) {
      var li = $( '<li />' );
      li.append( $( '<span />' ).text( bundle_name ).addClass( 'folder' ) );

      var levels_ul = $( '<ul />' ).attr( 'id', 'level-pack-' + bundle_name );
      li.append( levels_ul );

      $.each( levels, function( level_name, level ) {
        var level_id = 'level-pack-' + bundle_name + '-' + level_name + '-sprites';
        var level_li = $( '<li />' ).attr( 'id', level_id );
        var level_span = $( '<span />' ).addClass( 'file' );
        var level_anchor = $( '<a />' ).attr( {
          href: '#/load/' + bundle_name + '/' + level_name,
          'class': 'load-level-link'
        } );

        var level_options = $( '<span />' ).addClass( 'level-options' );
        level_options.append(
          $( '<a />' ).addClass( 'delete-level' ).attr( 'href', '#/level/delete/' + level_id )
        );

        var sprites_ul = $( '<ul />' ).attr( 'id', level_id );

        var select = function( anchor ) {
          var anchor_index = $( '#levels #' + level_id + ' .select-sprite' ).index( anchor );
          $( $( '#iphone div' )[ anchor_index ] ).mousedown();
        }

        $.each( level.actors, function( index, sprite ) {
          var sprite_li = $( '<li />' );
          var sprite_anchor = $( '<a />' ).addClass( 'select-sprite' ).text( sprite.tag || sprite.image_name );

          var sprite_options = $( '<span />' ).addClass( 'level-sprite-options' );
          sprite_options.append(
            $( '<a />' ).addClass( 'delete-sprite' ).attr( 'href', '#/sprite/delete' ).mousedown( function() {
              select( sprite_anchor );
            } )
          );

          sprite_anchor.click( function() {
            select( this );
          } );

          var sprite_span = $( '<span />' ).append( sprite_anchor );
          sprite_span.append( sprite_options );
          sprite_li.append( sprite_span );
          sprites_ul.append( sprite_li );
        } );

        level_anchor.text( level_name );
        level_span.append( level_anchor );
        level_span.append( level_options );
        level_li.append( level_span );
        level_li.append( sprites_ul );
        levels_ul.append( level_li );
      } );

      $( '#levels ul#level-packs' ).append( li );
    } );
    $( '#levels ul#level-packs' ).treeview({collapsed: true, unique: true});

    $( '#levels ul#level-packs a.load-level-link' ).click( function() {
      $( '#levels ul#level-packs a.load-level-link' ).removeClass( 'selected-level' );
      $( this ).addClass( 'selected-level' );
    } );
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

  spriteFor: function( bundle_name, sprite_name ) {
    attrs = this.atlas_packs[ bundle_name ] && this.atlas_packs[ bundle_name ][ sprite_name ];
    if ( attrs ) {
      return new Sprite( bundle_name, attrs.x, attrs.y, attrs.w + 'px', attrs.h + 'px' );
    }
  },

  // removes all elements from the sprite atlas menu
  clearMenu: function() {
    $( '#textures div' ).remove();
  },

  // generates a menu with all available sprite atlases
  buildMenu: function() {
    $.each( this.atlas_packs, function( bundle_name, images ) {
      var div = $( '<div />' ).attr( 'id', 'atlas-pack-' - bundle_name );
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

var spriteEventHandlers = {
  // setup and show attributes pane when a sprite is touched
  mousedown: function() {
    var sprite = $( this );
    var position = subtractPositionFromTarget( sprite.position(), $( '#iphone' ) );

    $( '#iphone div' ).removeClass( 'selected' );
    sprite.addClass( 'selected' );

    $( '#sprite #position #x' ).text( parseInt( position.x ) );
    $( '#sprite #position #y' ).text( parseInt( position.y ) );

    $( '#sprite input' ).each( function() {
      var target = $( this );
      var value = $( '#iphone .selected' ).data( 'metadata' )[ target.attr( 'id' ) ];
      target.val( value || '' );
    } );

    $( '#sprite' ).show();
  }
}

// TODO: this should take variadic args
$.fn.cycleClasses = function( a, b ) {
  return this.each(function() {
    var target = $( this );
    if ( target.hasClass( a ) ) {
      target.removeClass( a );
      target.addClass( b );
    } else {
      target.addClass( a );
      target.removeClass( b );
    }
  } );
}

// setup interface routing
var app = $.sammy( function() {
  this.use( Sammy.Template );

  // toggles the iphone canvas between landscape and portrait
  this.get( '#/flip', function( context ) {
    var width = $( '#iphone' ).width();
    var height = $( '#iphone' ).height();

    $( '#iphone-case' ).cycleClasses( 'horizontal', 'vertical' );
    $( '#change-orientation' ).cycleClasses( 'clockwise', 'anticlockwise' );
    $( '#iphone' ).width( height );
    $( '#iphone' ).height( width );

    /* TODO: rotate sprite positions to match up with phone orientation, need to translate from origin 0, 0
    var angle = 10;
    var x, y;
    $( '#iphone div' ).each( function() {
      var position = $( this ).position();
      x = position.left * Math.cos( angle ) - position.top * Math.sin( angle );
      y = position.left * Math.sin( angle ) + position.top * Math.cos( angle );
console.log(x,y);
      $( this ).css( {
        left: x + 'px',
        top: y + 'px'
      } );
    } );
    */

    this.redirect( '#/' );
  } );

  // close the sprite attribute pane
  this.get( '#/close', function( context ) {
    $( '#sprite' ).hide();
    this.redirect( '#/' );
  } );

  // loads given level onto the iphone
  this.get( '#/load/:bundle_name/:level_name', function( context ) {
    LevelManager.clearLevel();
    LevelManager.loadLevel( this.params.bundle_name, this.params.level_name );

    this.redirect( '#/' );
  } );

  this.get( '#/new-level-pack', function( context ) {
    this.redirect( '#/' );
  } );

  this.get( '#/new-level', function( context ) {
    this.redirect( '#/' );
  } );

  this.get( '#/save-canvas', function( context ) {
    this.redirect( '#/' );
  } );

  this.get( '#/save-canvas-as', function( context ) {
    this.redirect( '#/' );
  } );

  this.get( '#/clear-canvas', function( context ) {
    LevelManager.clearLevel();
    this.redirect( '#/' );
  } );

  // move the selected sprite by :amount
  this.get( '#/move-layer/:amount', function( context ) {
    var sprite = $( '#iphone .selected' );
    var z = parseInt( sprite.css( 'z-index' ) );
    z = isNaN( z ) ? 0 : z;

    switch ( this.params.amount ) {
      case 'bottom':
        z = 0;
        break;
      case 'top':
        z = 10;
        break;
      case '-1':
        z--;
        break;
      default:
        z++;
    }

    if ( z < 1 ) {
      z = 0;
      sprite.fadeTo( 500, 0.3 );

    } else {
      sprite.fadeTo( 500, 1 );
    }

    sprite.css( 'z-index', z );
    sprite.data( 'metadata' ).z = z;
    this.redirect( '#/' );
  } );

  this.get( '#/level/delete/:id', function( context ) {
    if ( confirm( 'Do you really want to premanently delete this level?' ) ) {
      LevelManager.removeLevelById( this.params[ 'id' ] );
      $( '#' + this.params[ 'id' ] ).remove();
console.log( $(LevelManager.level_packs).serialize());
      $.post( '/levels/save', $( LevelManager.level_packs ).serialize() );
    }
    this.redirect( '#/' );
  } );

  // remove currently selected sprite from the iphone canvas
  this.get( '#/sprite/delete', function( context ) {
    $( '#sprite' ).hide();

    var index = $( '#iphone div' ).index( $( '.selected' ) )
    var id = $( '.selected-level' ).parents( 'li' ).attr( 'id' );
    var sprites = $( '#' + id );

    sprites.find( 'li:nth(' + index + ')' ).remove();
    sprites.find( 'li:last' ).addClass( 'last' );
    $( '#iphone div.selected' ).remove();

    this.redirect( '#/' );
  } );
} );


$( function() {
  app.run( '#/' );
  AtlasManager.load();
  LevelManager.load();

  $( '#sprite' ).hide();
  $( '#tag, #z' ).blur( function() {
    var target = $( this );
    var metadata = $( '#iphone .selected' ).data( 'metadata' );
    metadata[ target.attr( 'id' ) ] = target.val();
  } );

  $( '#options #color-wheel' ).ColorPicker( {
    color: '#000000',
    onShow: function( picker ) {
      $( '#iphone' ).css( 'backgroundColor', '#' + this.color );
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
        var data = ui.draggable.data( 'metadata' );
        var sprite_obj = new Sprite(
          data.bundle_name,
          data.position.x,
          data.position.y,
          data.dimensions.width,
          data.dimensions.height
        );

        var sprite = sprite_obj.element;
        var metadata = sprite.data( 'metadata' );

        sprite.draggable( { containment: 'parent' } );
        $( '#iphone' ).append( sprite );

        sprite.data( 'onBoard', true );
        sprite.mousedown( spriteEventHandlers.mousedown );

      // this object has already been dropped on the iphone canvas
      } else {
        var sprite = ui.draggable;
        var metadata = sprite.data( 'metadata' );
      }

      sprite.css( {
        position: 'absolute',
        left: ui.position.left + 'px',
        top: ui.position.top + 'px'
      } );

      var point = subtractPositionFromTarget( ui.position, $( '#iphone' ) );

      metadata.position.x = point.x;
      metadata.position.y = point.y;

      sprite.mousedown();
    }
  } );
} );
