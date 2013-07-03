//TODO move this to an appropriate place
function ImageSection(image, gridSize, gridX, gridY, sizeX, sizeY) {
    this.image = image;
    this.tile = gridSize;
    this.sX = gridX * gridSize;
    this.sY = gridY * gridSize;
    this.sW = sizeX * gridSize;
    this.sH = sizeY * gridSize;
}

var globalEntityIndex = 0;

function baseObject (objDat) {
        this.pos = {
            x: objDat.x, 
            y: objDat.y
        };
        this.dim = {
            w: objDat.w,
            h: objDat.h
        };
        this.entID = globalEntityIndex++;
        if (objDat.hide) {
            this.visible = true;
        };
        if (!objDat.reel) {
            this.getDrawData = function() {
                return {
                    x: this.pos.x - this.dim.w/2,
                    y: this.pos.y - this.dim.h/2,
                    width: this.dim.w,
                    height: this.dim.h,
                    image: null,
                };
            };
        } else {
            this.animFrame = 0;
            this.reelIdx = 0;
            this.reel = reel;
            this.getDrawData = function() {
                this.animFrame+= 1;
                if (this.animFrame > this.reel[this.reelIdx][1]) {
                    this.reelIdx = (this.reelIdx + 1) % this.reel.length;
                    this.animFrame = 0;
                }
                var img = this.reel[reelIdx][0];
                return {
                    x: this.pos.x - img.w / 2,
                    y: this.pos.y - img.h / 2,
                    width: img.w,
                    height: img.h,
                    image: img,

                }
            };
            this.loadReel = function(reel) {
                this.animFrame = 0;
                this.reelIdx = 0;
                this.reel = reel;
            };
        }
        entityManager.registerEntity(this);
        this._dead = false;
};

baseObject.prototype.update = function () {};

baseObject.prototype.updateChain = function () {
    var i;
    for(i = this.__proto__; i.update; i = i.__proto__){
        i.update.call(this);
    }
};

/* A physicalObject is an object with an attached Box2D body */
function physicalObject (physDefn) {
        baseObject.call(this, physDefn);
        //Create a Box2D box!!
        this.pBody = physicsEngine.makeBody(physDefn, this);
        this.skipUpdate = (physDefn.isStatic)?true:false;
};

physicalObject.prototype.__proto__ = baseObject.prototype;

physicalObject.prototype.update=function () {
    //Update positions from Box2D
    if (!this.skipUpdate) {
        var coord = this.pBody.GetPosition(); 
        this.pos.x = coord.x*_scale;
        this.pos.y = coord.y*_scale;
    };
};

physicalObject.prototype.stall = function() {
    this.pBody.SetLinearVelocity({x:0, y:0});
}

physicalObject.prototype.push = function (fVec) {
    this.pBody.ApplyForce(fVec, this.pBody.GetWorldCenter());
}


/* A mortalObject is basically any object with health */
function mortalObject (mortalDefn) {
    physicalObject.call(this, mortalDefn);
    var health = 100;
    this.hurt = function(amt) {
        health -= amt;
        if (health<0) {
            this._dead = true;
            console.log('destroyed', this);
        }
    }
}

mortalObject.prototype.__proto__ = physicalObject.prototype;

mortalObject.prototype.update = function() {};

/*
*   playerObjects are for use in top-view games
*   moves with same impulse in all directions
*   Also has support for firing using keyboard.
*   
*   Change the keyState keys in the controlEngine
*   needed to whatever you like 
*
* */
function playerObject (playerDefn) {
        playerDefn.userData = 'player';
        playerDefn.filterGroup = -1;
        mortalObject.call(this, playerDefn);
        this.moveAcc = playerDefn.acceleration;
        this.weapon = playerDefn.weapon;
};

playerObject.prototype.__proto__ = mortalObject.prototype;

playerObject.prototype.update=function () {

    //VIEWPORT CENTER
    drawManager.snapViewport(this.pos)
    
    //WEAPON UPDATE
    this.weapon.update();
    
    //MOVEMENT
    var mVec = controlEngine.getMovementVector();
    if (mVec.x || mVec.y) {
        this.push(vMath.magnify(vMath.normalize(mVec), this.moveAcc));
    }
    
    //FIRING
    var fVec = vMath.normalize(controlEngine.getFiringVector());
    if (fVec.x || fVec.y ) {
        var cPos = vMath.multAdd(this.pos, this.dim.w, fVec);
        var cVel = this.pBody.GetLinearVelocity();
        this.weapon.fire({
            x: cPos.x,
            y: cPos.y,
            dx: fVec.x,
            dy: fVec.y,
            sx: cVel.x,
            sy: cVel.y
        });
    }
};

function bulletObject (bulletData) {
    bulletData.userData = 'bullet';
    physicalObject.call(this, bulletData);
    this.timeout = bulletData.timeout;
    this.pBody.SetLinearVelocity({
        x: bulletData.dx*bulletData.speed+bulletData.sx, 
        y: bulletData.dy*bulletData.speed+bulletData.sy
    });
    this.hitDamage = bulletData.hitDamage;
}

bulletObject.prototype.__proto__ = physicalObject.prototype;

bulletObject.prototype.update = function() {
    if (!this.timeout--) {
        this._dead = true;
    }
}

function zombieObject (zombieData) {
    zombieData.userData = 'zombie';
    mortalObject.call(this, zombieData);
    this.acc = zombieData.acceleration;
    this.path = []
    this.maxVel = zombieData.maxVel;
}

zombieObject.prototype.__proto__ = mortalObject.prototype;

zombieObject.prototype.update = function () {
    // Limit velocity
    this.pBody.SetLinearVelocity(vMath.limit(this.pBody.GetLinearVelocity(), this.maxVel))
    // Swarm Manager
    var aVec = physicsEngine.queryAggregateVector(this.pBody, 'zombie', 300, 60, 20, 'player', 'wall');
    if (Math.random()*3000 < 10) {
        this.push(vMath.magnify(aVec[3], 6));
    }
    for(var i = 0; i < aVec.length; i++) {
        this.push(aVec[i]); 
    }
    // Primitive Clustering
/*     var mVec = levelManager.getConvergenceVector(this.pos);
 *     this.pBody.SetLinearVelocity(vMath.magnify(vMath.normalize(mVec), this.moveSpeed));
 *     this.step = 60 + Math.random()*300;
 *  */
    // Lookahead
/*     if (this.path.length == 0) {
 *         this.path = levelManager.generatePath(this.pos)
 *     }
 *     else {
 *         var dir = this.path.pop(),
 *             cVec = { x: dir[0], y: dir[1] };
 *         this.pBody.SetLinearVelocity()
 * 
 *     } */
}

// Abstract objects are glorified containers
function abstractWeapon(weaponData) {
    this.name = weaponData.name;
    this.cooldown = weaponData.cooldown;
    this.blockFire = 0;
    this.bullet = weaponData.bullet;
    this.fire = function(vecDat) {
        if(this.blockFire>0)
            return;
        this.bullet(vecDat)
        this.blockFire = this.cooldown;
    };
    this.update = function() {
        if(this.blockFire>0)
            this.blockFire--;
    };
}