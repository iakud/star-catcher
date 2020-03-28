// Learn cc.Class:
//  - https://docs.cocos.com/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

const Player = require('Player');

cc.Class({
    extends: cc.Component,

    properties: {
        // 这个属性引用了星星预制资源
        starPrefab: {
            default: null,
            type: cc.Prefab
        },
        scoreFXPrefab: {
            default: null,
            type: cc.Prefab
        },
        // 星星产生后消失时间的随机范围
        maxStarDuration: 0,
        minStarDuration: 0,
        // 地面节点，用于确定星星生成的高度
        ground: {
            default: null,
            type: cc.Node
        },
        // player 节点，用于获取主角弹跳的高度，和控制主角行动开关
        player: {
            default: null,
            type: Player
        },
        // score label 的引用
        scoreDisplay: {
            default: null,
            type: cc.Label
        },
        // 得分音效资源
        scoreAudio: {
            default: null,
            type: cc.AudioClip
        },
        btnNode: {
            default: null,
            type: cc.Node
        },
        gameOverNode: {
            default: null,
            type: cc.Node
        },
        controlHintLabel: {
            default: null,
            type: cc.Label
        },
        keyboardHint: {
            default: '',
            multiline: true
        },
        touchHint: {
            default: '',
            multiline: true
        },
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},
    onLoad: function() {
        // 获取地平面的 Y 轴坐标
        this.groundY = this.ground.y + this.ground.height/2;
        // 存放最后的星星坐标X
        this.currentStar = null;
        this.currentStarX = 0;
        // 初始化计时器
        this.timer = 0;
        this.starDuration = 0;
        // 显示菜单或者游戏运行中
        this.enabled = false;
        // 初始化控制提示
        var hintText = cc.sys.isMobile ? this.touchHint : this.keyboardHint;
        this.controlHintLabel.string = hintText;
        // 初始化star和score池
        this.starPool = new cc.NodePool('Star');
        this.scorePool = new cc.NodePool('ScoreFX');
    },

    onStartGame: function() {
        // 初始化计分
        this.resetScore();
        // 设置游戏状态为运行中
        this.enabled = true;
        // 设置button和gameover文本到屏幕外
        this.btnNode.x = 3000;
        this.gameOverNode.active = false;
        // 重置玩家位置和移动速度
        this.player.startMoveAt(cc.v2(0, this.groundY));
        // 生成一个新的星星
        this.spawnNewStar();
    },

    spawnNewStar: function() {
        // 使用给定的模板在场景中生成一个新节点
        var newStar = null;
        if (this.starPool.size() > 0) {
            // this will be passed to Star's reuse method
            newStar = this.starPool.get(this);
        } else {
            newStar = cc.instantiate(this.starPrefab);
        }
        // 将新增的节点添加到 Canvas 节点下面
        this.node.addChild(newStar);
        // 为星星设置一个随机位置
        newStar.setPosition(this.getNewStarPosition());
        // 在星星组件上暂存 Game 对象的引用
        newStar.getComponent('Star').init(this);
        // start star timer and store star reference
        this.startTimer();
        this.currentStar = newStar;
    },

    despawnStar (star) {
        this.starPool.put(star);
        this.spawnNewStar();
    },

    startTimer: function() {
        // 重置计算器，根据消失时间范围随机取一个值
        this.starDuration = this.minStarDuration + Math.random() * (this.maxStarDuration - this.minStarDuration);
        this.timer = 0;
    },

    getNewStarPosition: function() {
        // 如果没有星星，设置一个随机坐标X
        if (!this.currentStar) {
            this.currentStarX = (Math.random() - 0.5) * 2 * this.node.width/2;
        }
        var randX = 0;
        // 根据地平面位置和主角跳跃高度，随机得到一个星星的 y 坐标
        var randY = this.groundY + Math.random() * this.player.jumpHeight + 50;
        // 根据屏幕宽度，随机得到一个星星 x 坐标
        var maxX = this.node.width/2;
        if (this.currentStarX >= 0) {
            randX = -Math.random() * maxX;
        } else {
            randX = Math.random() * maxX;
        }
        this.currentStarX = randX;
        // 返回星星坐标
        return cc.v2(randX, randY);
    },

    gainScore: function(pos) {
        this.score += 1;
        // 更新 scoreDisplay Label 的文字
        this.scoreDisplay.string = 'Score: ' + this.score;
        // 播放特效
        var fx = this.spawnScoreFX();
        this.node.addChild(fx.node);
        fx.node.setPosition(pos);
        fx.play();
        // 播放得分音效
        cc.audioEngine.playEffect(this.scoreAudio, false);
    },

    spawnScoreFX: function() {
        var fx;
        if (this.scorePool.size() > 0) {
            fx = this.scorePool.get();
            return fx.getComponent('ScoreFX');
        } else {
            fx = cc.instantiate(this.scoreFXPrefab).getComponent('ScoreFX');
            fx.init(this);
            return fx;
        }
    },

    despawnScoreFX (scoreFX) {
        this.scorePool.put(scoreFX);
    },

    resetScore: function() {
        this.score = 0;
        this.scoreDisplay.string = 'Score: ' + this.score;
    },

    gameOver: function() {
        this.gameOverNode.active = true;
        this.player.stopMove(); // 停止 player 节点的跳跃动作
        this.currentStar.destroy();
        this.btnNode.x = 0;
    },

    start () {

    },

    // update (dt) {},
    update: function(dt) {
        // 每帧更新计时器，超过限度还没有生成新的星星
        // 就会调用游戏失败逻辑
        if (!this.enabled) {
            return;
        }
        if (this.timer > this.starDuration) {
            this.gameOver();
            this.enabled = false;
            return;
        }
        this.timer += dt;
    }
});
