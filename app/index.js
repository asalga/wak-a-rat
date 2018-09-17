/*
  Animation.js
  
  TODO:
    - fix onComplete
    - figure out standard for queue
*/
'use strict';

let Assets = require('./Assets');
let assets;

const msPerFrame = 150;
let pausedTime = 0;

/*
  cfg {
    {Object} p5
    {Array} animations - array
    {String} atlasName
    {String} startFrame
  }
*/
let Animation = function(cfg) {
  Object.assign(this, cfg || {});
  assets = new Assets(this.p5);
  this.firstTime = true;
  this.reset();
  this.dirty = true;
};

Animation.prototype = {

  /*
   */
  nextAnimation() {
    this.currAnimation++;
    this.frameIdx = 0;
    this.dirty= true;

    if (this.currAnimation === this.queue.length) {
      this.done = true;
      this.complete();
    }
  },

  /*
   */
  update(dt) {
    this.dirty= true;

    if (this.done) {
      this.isPlaying = false;
      return;
    }

    // get the name of the animation ie) 'idle'
    let aniName = this.queue[this.currAnimation];
    if (!aniName) {
      return;
    }

    if (aniName === '_pause_' && pausedTime > 0) {
      pausedTime -= dt;

      if (pausedTime < 0) {
        pausedTime = 0;
        this.nextAnimation();
      }
      return;
    }

    if (typeof aniName === 'function') {
      aniName();
    }

    // this.t += dt;
    this.t += dt;
    if (aniName !== '_pause_' && this.t >= msPerFrame) {

      this.t -= msPerFrame;
      this.frameIdx++;
      this.dirty = true;

      // reached the end of the animation
      if (this.frameIdx === this.animations[aniName].length) {
        this.nextAnimation();
      }
    }
  },

  /*
    Return null if the animation is paused
  */
  getFrame() {
  //  this.dirty = true;

    // If the animation playing hasn't started yet, but we
    // still need to show a frame, so the animation image
    // doesn't just 'jump' into existance
    if (!this.started && this.startFrame && this.firstTime) {
      return assets.atlases[this.atlasName].frames[this.startFrame];
    }

    // Animation has finished and we need to maintain the last frame.
    if (this.done && this.endFrame) {

      this.firstTime = false;
      return assets.atlases[this.atlasName].frames[this.endFrame];
    }

    //
    if (this.queue.length === 0) {
      // console.log('getFrame(): queue is empty');
      return null;
    }

    let aniName = this.queue[this.currAnimation];
    // let aniName = this.queue[this.currAnimation];
    if (aniName === '_pause_' || this.done) {
      return null;
    }

    let f = this.animations[aniName][this.frameIdx];
    return assets.atlases[this.atlasName].frames[f];
  },

  /*
   */
  reset() {
    // console.log('reset:', this.name);
    this.queue = [];
    this.currAnimation = 0;
    this.isPlaying = false;
    this.frameIdx = 0;
    this.t = 0;
    this.done = false;
    this.started = false;
    this.complete = require('./Utils').noop;

    return this;
  },

  /*
   */
  onComplete(f) {
    // console.log('onComplete');
    this.complete = f;
    return this;
  },

  /*
    name - animation name
    count - {optional} number of times to play the animation
  */
  play(name, count) {
    // console.log('play:', this.name);

    this.started = true;
    this.isPlaying = true;


    // If the animation is already finished, we'll need to reset it so 
    // it can replay.
    if (this.done) {
      this.reset();
    }

    if (typeof count === 'undefined') {
      this.queue.push(name);
    } else {
      // in case user passes in negative value
      count = Math.max(count, 0);

      while (count) {
        this.queue.push(name);
        count--;
      }
    }
    return this;
  },

  /*
   */
  pause(timeInMS) {
    // console.log('pause:', this.name);
    if (timeInMS > 0) {
      this.queue.push('_pause_');
      pausedTime = timeInMS;
    }
    return this;
  },

  /*
   */
  stop() {
    // console.log('stop:', this.name);
    this.t = 0;
    this.frameIdx = 0;
    this.currAnimation = 0;
    this.queue = [];
    this.isPlaying = false;
    return this;
  },
};

module.exports = Animation;
'use strict';

const Atlas = require('./Atlas');
const Howl = require('Howler').Howl;
const Manifest = require('./Manifest');

let instance;

let Assets = function(p) {

  if (instance) {
    return instance;
  }

  instance = this;
  this.p5 = this.p5 || p;

  this.images = {};
  this.atlases = {};
  this.audio = {};

  this.numAssetsLoaded = 0;

  /*
   */
  this.preload = function() {

    if (this.isDone()) {
      return;
    }

    let that = this;

    // ** ATLASES
    Manifest.atlases.forEach((v) => {

      that.p5.loadImage(v.atlas, function(atlasImg) {
        // Once the image is loaded, get the meta file
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {

          let atlas = new Atlas({
            name: v.name,
            img: atlasImg,
            meta: xhr.responseText,
            p: that.p5
          });

          that.atlases[v.name] = atlas;

          that.numAssetsLoaded++;
        };
        xhr.open('GET', v.meta);
        xhr.send();
      });
    });

    // ** AUDIO
    Manifest.audio.forEach((v) => {
      // 
      that.audio[v.path] = new Howl({
        src: v.path,
        volume: 1,
        loop: false,
        autoplay: false,
        onload: v => {
          that.numAssetsLoaded++;
        }
      });
    });

    // ** IMAGES
    Manifest.images.forEach(v => {
      that.p5.loadImage(v, p5img => {
        that.images[v] = p5img;
        that.numAssetsLoaded++;
      });
    });
  };

  /*
   */
  this.isDone = function() {
    let totalAssets = Manifest.images.length + Manifest.atlases.length + Manifest.audio.length;
    return this.numAssetsLoaded === totalAssets;
  };

  /*
    Should find a better way of deciding which object to peek in.
   */
  this.get = function(key) {

    // Fix this 
    if (!this.images[key] && !this.audio[key]) {
      throw Error(`${key} needs to be preloaded before it can be used.`);
    }

    if (this.images[key]) {
      return this.images[key];
    }

    if (this.audio[key]) {
      return this.audio[key];
    }
  };

};

module.exports = Assets;
'use strict';

/*
  Atlas.js
  
  cfg{
   img - p5Image
   meta - string
  }
*/
function Atlas(cfg) {
  Object.assign(this, cfg);
  this.split();
}

Atlas.prototype = {
  get() {},

  split() {
    this.frames = {};

    let sheetFrames = JSON.parse(this.meta)['frames'];

    sheetFrames.forEach((f, i) => {

      // remove '.png' part of filename, we don't need it.
      let filename = (f.filename).split('.')[0];

      let x = f.frame.x;
      let y = f.frame.y;
      let w = f.frame.w;
      let h = f.frame.h;
      this.frames[filename] = this.img.get(x, y, w, h);
    });
  }
};

module.exports = Atlas;
'use strict';

/*
  Singleton for managing the rats
*/

let Rat = require('./characters/Rat');
let Utils = require('./Utils');
let Assets = require('./Assets');

// make game more difficult by reducing size of hitboxes?
const HitboxWidth = 80;
const HitBoxHeight = 26;

let hitBoxPositions = [
  { x: 164, y: 260, w: HitboxWidth, h: HitBoxHeight }, // top
  { x: 70, y: 310, w: HitboxWidth, h: HitBoxHeight }, // bottom left
  { x: 210, y: 300, w: HitboxWidth, h: HitBoxHeight }, // center
  { x: 344, y: 286, w: HitboxWidth, h: HitBoxHeight }, // far right
  { x: 250, y: 340, w: HitboxWidth, h: HitBoxHeight }, // bottom
  { x: 30, y: 200, w: 120, h: 100 } // max
];

// these coordinates are the slot positions offset
// by the rat image coords. so they can be used directly with image()
let ratSlotCoords = [
  { x: 146, y: 164 }, //top
  { x: 54, y: 212 }, // bottom left
  { x: 190, y: 202 }, //center
  { x: 329, y: 188 }, //far right
  { x: 232, y: 246 } // bottom
];

let instance;
let assets;


/*
  ratsIn - array of rats that are 'inside' the game board
  ratsOut - array of rats that are 'outside'/visible
*/
(function() {


  let freeSlots = [2, 4, 0, 1, 3],
    ratsOut = [],
    ratsIn = [],
    numMisses = 0,
    numHits = 0,
    // When rendering, we need to render based on the order of the slots.
    ratSlots = [null, null, null, null, null],

    gameTimeElapsed = 0,
    nextTime = 2000;
    // dirty=true;

  // stored in reverse order so we can just use pop()
  let t = [41.468, 39.515, 38.851, 38.187, 36.731, 36.572, 35.452, 34.41, 33.092, 30.987, 30.818, 30.258, 28.971, 28.315, 25.553, 25.225, 23.961, 22.961, 22.617, 20.314, 19.529, 18.864, 17.256, 16.952, 15.743, 14.896, 12.727, 12.591, 12.158, 11.159, 10.728, 8.183, 7.966, 5.438, 4.661, 3.988, 2.485, 1.541, 1.15, 0.773, 0];
  let timings = [];

  t.forEach( (v) => {
    timings.push(v*1.5);
  });
  
  if (instance) {
    return instance;
  }
  instance = this; 

  this.gameHasEnded = false;

  // this.isDirty = function(){return dirty;}

  /*
    -- Deprecated  --

    Get the next time we'll release a rat.
    frequency increases proportionally with time increase.
  */
  this.getNextTime = function() {
    let time = gameTimeElapsed / 1000;

    // if (time > 40) {return this.p5.random(100, 200);}
    if (time > 30) return this.p5.random(200, 400);
    if (time > 20) return this.p5.random(300, 500);
    if (time > 10) return this.p5.random(400, 700);
    return this.p5.random(500, 1000);
  };

  /*
    {Object} p - point object with properties x & y

    Order of slots indices in quinqunx ranges from 0-5
    the 'Max' slot is index 5.

    5     0       3
              2
          1       4

    return {Number} from -1 to 5 inclusive
  */
  this.hit = function(p) {
    let retIdx = -1;
    let hitRat = false;
    const MaxSlot = 5;

    hitBoxPositions.forEach((rectangle, slotID) => {

      if (Utils.pointInRect(p, rectangle)) {

        // We hit one of the slots, is it occupied?
        ratsOut.forEach((rat) => {
          if (rat.slotID === slotID) {
            rat.hit();
            hitRat = true;
          }
        });
        retIdx = slotID;
      }
    });

    // TODO: fix 'new'
    if(hitRat === false && retIdx !== -1 && retIdx !== MaxSlot){
      assets = new Assets();
      assets.get('data/audio/sam/miss.mp3').play();
    }

    return retIdx;
  };

  /*
    Let the GameBoard know this slot can now be re-used

    {Object} rat - Rat that is going back in the board
  */
  this.freeSlot = function(rat) {
    freeSlots.push(rat.slotID);

    this.p5.shuffle(freeSlots, true);

    let idx = ratsOut.indexOf(rat);
    if (idx !== -1) {
      ratsIn.push(ratsOut.splice(idx, 1)[0]);
    }

    ratSlots[rat.slotID] = null;
    rat.slotID = -1;
  };

  /*
   */
  this.update = function(dt) {
    // dirty = false;

    gameTimeElapsed += dt;
    nextTime -= dt;

    // if (timeElapsed >= nextTime) {
    // if(nextTime <= 0){
    //   // timeElapsed = 0; //-= nextTime;
    //   nextTime = this.getNextTime();
    //   // console.log(nextTime);
    //   this.pushOutRat();
    // }

    let lastItem = timings[timings.length-1];
    let buff = 3;
    let curr = (gameTimeElapsed/1000)-buff;

    if( curr > lastItem){
      this.pushOutRat();
      timings.pop();
    }

    ratsOut.forEach(r => {
      r.update(dt)

      // if(r.dirty){
      //   dirty = true;
      // }
    });
  };

  this.increaseMisses = function() {
    numMisses++;
  };

  this.increaseHits = function() {
    numHits++;
  };

  this.getNumMisses = function() { return numMisses; };
  this.getNumHits = function() { return numHits; };

  /*
    Depending on where Sam's arm is, we'll need to adjust rendering order
    a = arm
    
    1: 0  a  2   4  3
    2: 0     a   4  3  1
    3: 0     2   4  a  1
    4: 0     2   a  3  1
    --------------------
    0: a     2   4  3  1
    5: a  0  2   4  3  1
   -1: a  0  2   4  3  1
   */
  this.render = function(sam) {
    let armPos = sam.getArmPosition();

    // If we are hitting Max or have an idle position, render arm first
    // then all rats above arm.
    if (armPos === 5 || armPos === -1) {
      sam.renderArm();
    }

    let renderOrder = [0, 2, 4, 3, 1];
    renderOrder.forEach(v => {
      if (armPos === v) {
        sam.renderArm();
      } else {
        if (ratSlots[v]) {
          ratSlots[v].render();
        }
      }
    });
    // dirty = false;
  };

  /*
    Request that a rat enter the game.
   */
  this.pushOutRat = function() {

    // No pushing any rats out if game is over
    if(this.gameHasEnded){
      return;
    }

    // If all the slots are occupied, we can't do anything
    if (freeSlots.length === 0) {
      return;
    }

    // Try to get a rat that is inside the gameboard
    let rat = ratsIn.pop();

    // If no rats in the queue, create a new one
    if (rat === undefined) {
      rat = new Rat({ p5: this.p5, name: 'rat' });
    }

    let slotID = freeSlots.pop();
    ratSlots[slotID] = rat;
    ratsOut.push(rat);
    rat.assignSlot(slotID);
    rat.position(ratSlotCoords[slotID]);
    rat.enterGame();
  };

}.bind(this)());

module.exports = {
  instance: instance,
  gameHasEnded : instance.gameHasEnded
};

Object.defineProperty(module.exports, 'instance', {
  value: instance,
  writable: false
});
/*
  Wak-a-Rat
  Andor Saga
  Oct 2017
*/

'use strict';

let p5 = require('p5');
let p5BitmapFont = require('p5-bitmapfont')(p5);

let KB = require('./KB');
let Assets = require('./Assets');
let GameBoard = require('./GameBoard').instance;
let Max = require('./characters/Max');
let Sam = require('./characters/Sam');
let UI = require('./UI');
// let Strings = require('./Strings');

// Place in Module
let Strings = {
  'PAUSED': 'Game Paused. Press SPACE to Continue.',
  'WIN': 'WINNER!',
  'LOSE': 'LOSER!'
};

let debug = true;
let paused = true;

let assets;
let _p5;

let now = 0,
  lastTime = 0,
  gameTime = 0;

let fps = 0;
// let dirty = true;
let framesSaved = 0;
let max, sam;

let bitmapFont, scummFont;

let bkMusic;


function update(dt) {
  if (paused) {
    return;
  }

  gameTime += dt;

  GameBoard.update(dt);
  sam.update(dt);
  max.update(dt);

  // if (sam.dirty || GameBoard.isDirty()) {
  //   dirty = true;
  // }
}

/*
  Music has finished playing we want to
  prevent further mouse clicks,
  prevent pausing, etc.
  show if user has won
*/
function endGame() {
  console.log('END GAME!');
  GameBoard.gameHasEnded = true;
}

function render() {
  // if (dirty === true) {
    _p5.image(assets.get('data/images/background/bk.png'), 0, 0);
    _p5.image(assets.get('data/images/background/board.png'), 0, 238);
    sam.renderBody();
    max.render();

    // render all the rats in the gameboard,
    // which takes care of rendering Sam's arm at the right time
    GameBoard.render(sam);
  // } else {
    // framesSaved++;
  // }
  // dirty = false;
}


/*

*/
function renderPauseOverlay() {
  _p5.noStroke();
  _p5.fill(0, 120)
  _p5.rect(0, 0, _p5.width, _p5.height);

  let rectObj = {
    x: 110,
    y: 140,
    h: 20,
    w: 440
  };

  _p5.image(assets.get('data/images/pause_bar.png'), rectObj.x, rectObj.y);
  _p5.bitmapTextFont(scummFont);
  _p5.tint(80, 80, 80);

  _p5.bitmapText(Strings['PAUSED'], rectObj.x + 5, rectObj.y + 1);
  _p5.noTint();
}

/*
  Draw score and win/lose strings in top left.
*/
function drawUI() {
  _p5.bitmapTextFont(bitmapFont);
  let x = 58;
  let y = 38;

  let scoreCopy = `${GameBoard.getNumHits()} - ${GameBoard.getNumMisses()}`;
  let wonLost = GameBoard.getNumHits() > 20 ? Strings['WIN'] : Strings['LOSE'];

  // If game has ended we alternate between showing
  // the WIN/LOSE copy and the Score
  if (GameBoard.gameHasEnded) {
    let t = ~~(gameTime / 1000);

    if (t % 2 == 0) {
      _p5.bitmapText(scoreCopy, x, y);
    } else {
      // TODO: fix font
      _p5.bitmapText(wonLost, x - 5, y);
    }
  } else {
    _p5.bitmapText(scoreCopy, x, y);
  }
}

/*
  Draw FPS & GameTime
*/
function drawDebug() {
  if (!debug) {
    return;
  }

  if (_p5.frameCount % 120 === 0) {
    fps = Math.round(_p5.frameRate());
  }

  _p5.bitmapTextFont(scummFont);
  _p5.bitmapText(`FPS: ${fps}`, 20, 60);
  _p5.bitmapText(`GameTime: ${~~(gameTime/1000)}`, 20, 80);
  _p5.bitmapText(`${_p5.mouseX} , ${_p5.mouseY}`, 20, 100);
  _p5.bitmapText(`framesSaved: ${framesSaved}`, 20, 120);
}


/*
 */
function togglePause() {
  if (GameBoard.gameHasEnded) {
    return;
  }

  paused = !paused;
  if (paused === false) {
    lastTime = _p5.millis();
    bkMusic.play();
    _p5.loop();
  } else {
    bkMusic.pause();
    _p5.noLoop();
  }
}

var newp5 = new p5(function(p, ) {
  _p5 = p;

  p.setup = function setup() {
    p.createCanvas(640, 400);
    p.bitmapTextFont(bitmapFont);
    p.frameRate(30);
    // document.body.style.cursor = "none";
    // p.cursor(p.CROSS);

    GameBoard.p5 = p;

    max = new Max({ p5: p });
    sam = new Sam({ p5: p });

    bkMusic = assets.get('data/audio/background/1_round.mp3');
    // bkMusic = assets.get('data/audio/placeholder/test.mp3');
    // bkMusic = assets.get('data/audio/placeholder/null.mp3');

    bkMusic.on('end', function(t) {
      console.log("MUSIC DONE!", t);
      endGame();
    });
  };

  /*
   */
  p.preload = function() {
    assets = new Assets(p);
    assets.preload();

    scummFont = p.loadBitmapFont('data/fonts/scumm.png', 'data/fonts/scumm.json');

    bitmapFont = p.loadBitmapFont('data/fonts/lucasFont.png', {
      // TODO: fix
      glyphWidth: 14, //11
      glyphHeight: 16, //14
      glyphBorder: 0,
      rows: 12,
      cols: 9, //8
      charSpacing: 1
    });
  };

  // p.mouseMoved = function() {
  //   dirty = true;
  // }

  /*
    User tried to hit a slot
  */
  p.mousePressed = function() {
    if (paused) {
      togglePause();
      // return;
    }

    let slotIdx = GameBoard.hit({ x: p.mouseX, y: p.mouseY });

    if (slotIdx >= 0 && slotIdx <= 5) {
      sam.hit(slotIdx);
    }
    if (slotIdx === 5) {
      sam.hit(5);
      max.hit();
    }
  };

  /*
   */
  p.keyPressed = function() {
    switch (p.keyCode) {
      case KB._D:
        debug = !debug;
        break;
      case KB._SPACE:
        togglePause();
        // dirty = true;
        break;
    }
  };

  /*
    TODO:fix timing
   */
  p.draw = function() {
    if (!assets.isDone()) {
      return;
    }

    now = p.millis();
    let delta = now - lastTime;

    update(delta);
    render();

    drawDebug();
    drawUI();

    if (paused) {
      renderPauseOverlay();
      // Use noloop here so we get at least 1 frame rendered.
      p.noLoop();
    }
    // p.image(assets.get('data/images/crosshair.png'), p.mouseX-25, p.mouseY-25);

    lastTime = now;
  };
});
'use strict';

const KB = {
  _SPACE: 32,

  _LEFT_ARROW: 37,
  _UP_ARROW: 38,
  _RIGHT_ARROW: 39,
  _DOWN_ARROW: 40,

  //
  _0: 48,
  _1: 49,
  _2: 50,
  _3: 51,
  _4: 52,
  _5: 53,
  _6: 54,
  _7: 55,
  _8: 56,
  _9: 57,

  //
  _A: 65,
  _B: 66,
  _C: 67,
  _D: 68
};

module.exports = KB;
/*
  
*/
'use strict';

let Manifest = {
  // IMAGES
  images: [
    'data/images/background/bk.png',
    'data/images/background/board.png',
    'data/images/crosshair.png',
    'data/images/pause_bar.png',

    'data/images/sam/arms/images/idle.png',
    'data/images/sam/arms/images/max.png',
    'data/images/sam/arms/images/center.png',
    'data/images/sam/arms/images/upper_left.png',
    'data/images/sam/arms/images/upper_right.png',
    'data/images/sam/arms/images/lower_left.png',
    'data/images/sam/arms/images/lower_right.png',

    'data/images/sam/sam.png'
  ],

  // ATLASES
  atlases: [{
      name: 'rat',
      atlas: 'data/images/rat/spritesheet.png',
      meta: 'data/images/rat/spritesheet.json'
    },
    {
      name: 'sam',
      atlas: 'data/images/sam/atlas.png',
      meta: 'data/images/sam/atlas.json'
    },
    {
      name: 'max',
      atlas: 'data/images/max/atlas.png',
      meta: 'data/images/max/atlas.json'
    }
  ],

  // TODO: add slugs names?
  audio: [{
      path: 'data/audio/max/max.mp3'
    },
    {
      path: 'data/audio/rat/hit0.mp3'
    },
    {
      path: 'data/audio/rat/hit1.mp3'
    },
    {
      path: 'data/audio/rat/hit2.mp3'
    },
    {
      path: 'data/audio/sam/miss.mp3'
    },
    {
      path: 'data/audio/background/1_round.mp3'
      // path: 'data/audio/placeholder/test.mp3'
      // path: 'data/audio/placeholder/null.mp3'
    }
  ]
};

module.exports = Manifest;
'use strict';
/*
	UI
 */

let instance;

let UI = function() {
  instance = this;
  if (instance) {
    return instance;
  }
}

module.exports = UI;
'use strict';

let Utils = {

  pointInRect(p, r) {
    if (p.x >= r.x && p.x <= r.x + r.w &&
      p.y >= r.y && p.y <= r.y + r.h) {
      return true;
    }
    return false;
  },
  noop() {}
};

module.exports = Utils;