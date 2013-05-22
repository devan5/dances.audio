/*_______
with dances

	called: Audio

	version: 2.0_dev

	firstDate: 2012.12.17

	lastDate: 2013.05.22

	require: [
		"dances.dom"
	],

	effect: [
		+ 实现背景音乐,
		+ {effects}
	];

	log: {
		"v1.0": [
			+ 快速实现
			+ 跨浏览器实现 背景音乐
			+ {logs}
		],

		"v2.0": [
			+ 适配 dances.amd
			+ 整理 API
		],
		
		"v2.1": [
			+ TODO 自动格式判断
			+ TODO 增加 flash 播放
			+ TODO preload, 预加载处理
			+ TODO 解决 非 html5 inst.volume() 不能设置为最低
			+ TODO 单页面音乐线程唯一性(增加一个配置, 占据唯一进程)
			+ TODO 思考 整站 音乐线程唯一性(使用 cookie localStorage)
			+ {logs}
		],
	}

_______*/

/*_______
# syntax
前提, 需要准备 *.mp3 与 *.ogg 文件
// evernote 浏览器商城支持的音频格式

## 实例化
	dances.audio(src);
	dances.audio(src, opts);
	dances.audio(opts);

### src
src, opts.src 必填其一
文件地址.

### opts.src
src, opts.src 必填其一
文件地址.

### opts.bAutoInit
自动初始化
默认: true


_______*/

/*_______
# API
## 实例方法

### isPlayed()
是否正在播放

### play()
播放

### pause()
暂停

### stop()
停止

### mute()
静音

### resume()
恢复音量

### toggleMute()
切换静音.

返回值: 布尔
true 代表 目前已静音
false 代表 目前已恢复音量

### volume()
设置音量, 取值范围 0-1

### remove()
清除实例

## 实例属性

### bLoaded
是否加载完毕

_______*/

(function(exports, name, undefined){
	"use strict";

	var
		Au,
		au,

		AuConf = {},
		initModule,
		bInit,

		fValidArgs,

		b5
	;

	var

		create = Object.create || (function(){

			var Foo = function(){ };

			return function(){

				if(arguments.length > 1){
					throw new Error('Object.create implementation only accepts the first parameter.');
				}

				var proto = arguments[0],
					type = typeof proto
					;

				if(!proto || ("object" !== type && "function" !== type)){
					throw new TypeError('TypeError: ' + proto + ' is not an object or null');
				}

				Foo.prototype = proto;

				return new Foo();
			}
		})(),

		uc = function(fn){
			return function(){
				return Function.prototype.call.apply(fn, arguments);
			}
		},

		slice = uc(Array.prototype.slice)
	;

	fValidArgs = function(conf, requireType, defaultConf){
		var fType = dances.type;
		defaultConf = defaultConf || {};

		for(var prop in requireType){
			// 可配置参数
			if(requireType.hasOwnProperty(prop)){

				// 不符合的必须配置参数
				if(!conf.hasOwnProperty(prop) || requireType[prop].indexOf(fType(conf[prop])) === -1){
					// 必须配置参数 有推荐值
					if(defaultConf.hasOwnProperty(prop)){
						conf[prop] = defaultConf[prop];

						// 必须配置参数 没有推荐值
					}else{
						conf[prop] = null;
					}
				}
			}
		}

		return conf;
	};

	initModule = function(foo){

		// 检测 html 支持性
		b5 = (function(){
			var
				b5 = false,
				El
			;

			if("function" === typeof window.Audio){
				El = new Audio;
				try{
					document.body.appendChild(El);
					El.parentNode.removeChild(El);
					b5 = true;

				}catch(e){
					b5 = false;
				}

				El = null;
			}

			return b5;
		})();

		// 创建类
		Au = {

			init: function(foo){
				var
					args = slice(this.conf),
					conf = args.pop(),
					src,
					_src,
					instEl,

					_this = this
				;

				if("[object Object]" === Object.prototype.toString.call(conf)){
					src = args.push();
					"string" !== typeof src && (src = undefined);

				}else{
					src = conf;
					conf = {};
				}

				conf = fValidArgs(conf, {
					src: "string",

					bLoop: "boolean",
					bAuto: "boolean",

					ready: "function"

				});

				// check src
				src = src ? src : conf.src;
				if(!src){
					throw ".audio expect src as basic param";
				}

				// 清理 src
				_src = /\S(\.[\d\w]+$)/.exec(src);
				if(_src){
					src = src.replace(new RegExp("\\"+_src[1] + "$"),"");
					conf.src = src;
				}

				// w3c Audio
				if(b5){
					instEl = new Audio;

					if(instEl.canPlayType("audio/mp3")){
						instEl.src = conf.src + ".mp3";

					}else if(instEl.canPlayType("audio/ogg")){
						instEl.src = conf.src + ".ogg";

					}else{
						// 悲催了
					}

					conf.bLoop && (instEl.loop = true);
					conf.bAuto && (this._played = instEl.autoplay = true);

					// 声音最大化
					instEl.volume = 1;

					instEl.onended = function(){
						_this._played = false;
					};

					instEl.addEventListener("canplay", function(){
						if(!_this.bLoaded){
							_this.bLoaded = true;
							"function" === typeof conf.ready && conf.ready(_this);
						}
					});

				// wm player
				}else{

					instEl =
						'<object class="none" data="' + conf.src + '.mp3" type="application/x-mplayer2" width="0" height="0">' +
							'<param name="src" value="' + conf.src + '.mp3">' +
							'<param name="autostart" value="' + (conf.bAuto ? "1" : "0") + '">' +
						'</object>'
					;

					instEl = dances.El(instEl);

					conf.bAuto && (this._played = true);

					// hack setting
					setTimeout(function(){
						// 声音最大化
						instEl.volume = 0;

						// loop
						instEl.playcount = conf.bLoop ? 55555 : 1;

					}, 55);


					// 嗅探 load
					this._checkLoad = function(){
						setTimeout(function(){
							if(instEl.BufferingProgress > 20){
								_this.bLoaded = true;
								"function" === typeof conf.ready && conf.ready(_this);
							}else{
								_this._checkLoad();
							}
						},150);
					};

					this._checkLoad();

				}

				window.inst = this;

				this.instEl = instEl;

				try{
					document.getElementsByTagName("body")[0].appendChild(instEl);

				}catch(e){
					alert("你的浏览器不支持\n推荐使用最新浏览器.");
				}

				this.init = function(foo){
					"function" === typeof foo && foo.call(this, this);
					return this;
				};

				"function" === typeof foo && foo.call(this, this);

				return this;
			},

			// 返回 boolean
			// true 已静音
			// false 非静音
			mute : function(){
				this.toggleMute(true);
				return this;
			},

			resume: function(){
				this.toggleMute(false);
				return this;
			},

			toggleMute: function(bl){
				if(this._played){

					bl = "boolean" === typeof bl ? bl : null;

					b5 ?
						(this.instEl.muted = (null === bl ? !this.instEl.muted : bl)) :
						(this.instEl.Mute = (null === bl ? !this.instEl.Mute : bl))
					;
				}

				return b5 ? this.instEl.muted : this.instEl.Mute;
			},

			stop: function(){
				this.pause();

				b5 ?
					(this.instEl.currentTime = 0) :
					(this.instEl.CurrentPosition = 0)
				;

				return this;
			},

			volume: function(n){
				// 0~1

				if(!isNaN(n -= 0)){

					if(n < 0){
						n = 0;

					}else if(1 < n){
						n = 1;
					}

					this.instEl.volume = b5 ? n : (n - 1) * 2000;
				}

				return this;
			},

			remove: function(){
				this.stop();
				this.instEl.parentNode.removeChild(this.instEl);

				b5 || clearTimeout(this.wTime);

				for(var prop in this){
					this.hasOwnProperty(prop) && (this[prop] = null);
				}
			}
		};

		Au.isPlayed = b5?
			function(fn){
				"function" === typeof fn && fn.call(this, this._played);
				return this._played;
			}
			:
			function(fn){
				var v1, bl;
				v1 = this.instEl.CurrentPosition;
				bl = this.instEl.CurrentPosition - v1 > 0;

				"function" === typeof fn && fn.call(this, bl);
				this._played = bl;

				return bl;

			}
		;

		Au.play = b5 ?
			function(){
				if(!this._played){
					this.instEl.play();
					this._played = true;
				}
				return this;

			} :
			function(){
				if(this.bLoaded && !this._played){
					this.instEl.play();
					this._played = true;
				}
				return this;
			}
		;

		Au.pause = b5 ?
			function(){
				if(this._played){
					this.instEl.pause();
					this._played = false;
				}

				return this;
			} :

			function(){
				if(this.bLoaded && this._played){
					this.instEl.pause();
					this._played = false;
				}

				return this;
			}
		;

		bInit = true;

		// 重载
		initModule = function(foo){
			"function" === typeof foo && foo.call(this);
			return this;
		};

		"function" === typeof foo && foo.call(this);

		return this;
	};

	au = function(){
		var
			iAu,
			conf
		;

		// checkAuto Init klass
		!bInit || false !== AuConf.bAutoInit && initModule();

		if(!bInit){
			$$log("Instantiated after init Audio", "warn");
			return au;
		}

		iAu = create(Au);
		conf = arguments[arguments.length - 1];

		// 保存"粗配置", 因为可以手动初始化
		iAu.conf = arguments;

		// checkAuto Init inst
		bInit && conf && false !== conf.bAutoInit && iAu.init();

		return iAu;
	};

	au.init = initModule;

	exports[name || "audio"] = au;

	"function" === typeof window.define && define.amd && define.amd.dancesAudio && define(function(){
		return au;
	});

})(window.dances);


