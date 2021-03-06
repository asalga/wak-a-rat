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

// TODO: Move to a Module
let Strings = {
  'PAUSED': 'Game Paused. Press SPACE to Continue.',
  'WIN': 'WINNER!',
  'LOSE': 'LOSER!',

  'AUDIO_ON': 'data/images/icons/audio_on.gif',
  'AUDIO_OFF': 'data/images/icons/audio_off.gif'
};

let debug = false;
let paused = true;
// let dirty = true;

let assets;
let _p5;

let now = 0,
  lastTime = 0,
  gameTime = 0;

let fps = 0;

let framesSaved = 0;
let max, sam;

let bitmapFont, scummFont;

let bkMusic;
let muted = true;

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
  setPause(paused);
}

function setPause(p){
  paused = p;

  if (paused === false) {
    lastTime = _p5.millis();
    bkMusic.play();
    _p5.loop();
  } else {
    bkMusic.pause();
    _p5.noLoop();
  }
}

function getEl(name){
  return document.getElementById(name);
}

function setupMuteBtn(){
  let muteBtn = getEl('audio-button');

  let muteImg = [ Strings['AUDIO_OFF'], Strings['AUDIO_ON'] ];

  muteBtn.src = muted ? muteImg[0] : muteImg[1];

  muteBtn.addEventListener('click', e => {
    muted = !muted;
    muteBtn.src = muted ? muteImg[0] : muteImg[1];
    Howler.mute(muted);
  });

  // save to show now that preload is done
  muteBtn.style.display = "block";
}


function checkPageFocus(){
  // If user changes tabs, the animation really messed up on return
  // so just pause on tab change.
  if(document.hasFocus() == false){
    setPause(true);
  }
}

var newp5 = new p5(function(p) {
  _p5 = p;

  p.setup = function setup() {
    let cvs = p.createCanvas(640, 400);
    cvs.parent('sketch-container');
    p.bitmapTextFont(bitmapFont);
    p.frameRate(30);


    setInterval( checkPageFocus, 200 );

    Howler.mute(muted);

    // Naw, let's use an image instead
    // document.body.style.cursor = "none";
    // p.cursor(p.CROSS);

    GameBoard.p5 = p;

    max = new Max({ p5: p });
    sam = new Sam({ p5: p });

    bkMusic = assets.get('data/audio/background/1_round_mono.mp3');

    bkMusic.on('end', function(t) {
      endGame();
    });

    setupMuteBtn();
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

  // p.mouseMoved = function() {dirty = true;}

  /*
    User tried to hit a slot
  */
  p.mousePressed = function() {
    if (paused) {
      togglePause();
      return;
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
}, "#cvs");