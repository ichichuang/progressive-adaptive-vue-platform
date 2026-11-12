/* Generated file. Do not edit directly. */
// prettier-ignore
;(function () {
  'use strict'

  /* Embedded from the declared Color.js dependency for exact current Custom color validation. */
  var PavpFirstPaintColor=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function n(e,n,r=[0,0,0]){let i=t(e,n[0]),a=t(e,n[1]),o=t(e,n[2]);return r[0]=i,r[1]=a,r[2]=o,r}function r(e){return i(e)===`string`}function i(e){return(Object.prototype.toString.call(e).match(/^\[object\s+(.*?)\]$/)[1]||``).toLowerCase()}function a(e,{precision:t=16,unit:n}){return o(e)?`none`:(e=+s(e,t),e+(n??``))}function o(e){return e===null}function s(e,t){if(e===0)return 0;let n=~~e,r=0;n&&t&&(r=~~Math.log10(Math.abs(n))+1);let i=10**(t-r);return Math.floor(e*i+.5)/i}function c(e,t,n){return o(e)||isNaN(e)?t:o(t)||isNaN(t)?e:e+(t-e)*n}function l(e,t,n){return(n-e)/(t-e)}function u(e,t,n){return!e||!t||e===t||e[0]===t[0]&&e[1]===t[1]||isNaN(n)||n===null?n:c(t[0],t[1],l(e[0],e[1],n))}function d(e,t,n){return Math.max(Math.min(n,t),e)}function f(e,t){if(e instanceof t)return!0;let n=t.name;for(;e;){let t=Object.getPrototypeOf(e),r=t?.constructor?.name;if(r===n)return!0;if(!r||r===`Object`)return!1;e=t}return!1}var p=class{type;coordMeta;coordRange;range;constructor(e,t){if(typeof e==`object`&&(this.coordMeta=e),t&&(this.coordMeta=t,this.coordRange=t.range??t.refRange),typeof e==`string`){let t=e.trim().match(/^(?<type><[a-z]+>)(\[(?<min>-?[.\d]+),\s*(?<max>-?[.\d]+)\])?$/);if(!t)throw TypeError(`Cannot parse ${e} as a type definition.`);this.type=t.groups.type;let{min:n,max:r}=t.groups;(n||r)&&(this.range=[+n,+r])}}get computedRange(){return this.range?this.range:this.type===`<percentage>`?this.percentageRange():this.type===`<angle>`?[0,360]:null}get unit(){return this.type===`<percentage>`?`%`:this.type===`<angle>`?`deg`:``}resolve(e){if(this.type===`<angle>`)return e;let t=this.computedRange,n=this.coordRange;return this.type===`<percentage>`&&(n??=this.percentageRange()),u(t,n,e)}serialize(e,t){let n=this.type===`<percentage>`?this.percentageRange(100):this.computedRange,r=this.unit;return e=u(this.coordRange,n,e),a(e,{unit:r,precision:t})}toString(){let e=this.type;if(this.range){let[t=``,n=``]=this.range;e+=`[${t},${n}]`}return e}percentageRange(e=1){let t;return t=this.coordMeta&&this.coordMeta.range||this.coordRange&&this.coordRange[0]>=0?[0,1]:[-1,1],[t[0]*e,t[1]*e]}static get(e,t){return f(e,this)?e:new this(e,t)}},m=Symbol(`instance`),h=class e{type;name;spaceCoords;coords;id;alpha;constructor(e,t=e.space){e[m]=this,this.type=`function`,this.name=`color`,Object.assign(this,e),this.space=t,this.type!==`custom`&&(this.spaceCoords=Object.values(t.coords),this.coords||=this.spaceCoords.map(e=>{let t=[`<number>`,`<percentage>`];return e.type===`angle`&&t.push(`<angle>`),t}),this.coords=this.coords.map((e,t)=>{let n=this.spaceCoords[t];return typeof e==`string`&&(e=e.trim().split(/\s*\|\s*/)),e.map(e=>p.get(e,n))}))}serializeCoords(e,t,n){return n=e.map((e,t)=>p.get(n?.[t]??this.coords[t][0],this.spaceCoords[t])),e.map((e,r)=>n[r].serialize(e,t))}coerceCoords(e,t){return Object.entries(this.space.coords).map(([n,r],i)=>{let a=e[i];if(o(a)||isNaN(a))return a;let s=t[i],c=this.coords[i].find(e=>e.type==s);if(!c){let e=r.name||n;throw TypeError(`${s??a?.raw??a} not allowed for ${e} in ${this.name}()`)}return a=c.resolve(a),c.range&&(t[i]=c.toString()),a})}canSerialize(){return this.type===`function`||this.serialize}parse(e){return null}static get(t,...n){return!t||f(t,this)?t:t[m]?t[m]:new e(t,...n)}},g=new class{add(e,t,n){if(typeof arguments[0]!=`string`){for(var e in arguments[0])this.add(e,arguments[0][e],arguments[1]);return}(Array.isArray(e)?e:[e]).forEach(function(e){this[e]=this[e]||[],t&&this[e][n?`unshift`:`push`](t)},this)}run(e,t){this[e]=this[e]||[],this[e].forEach(function(e){e.call(t&&t.context?t.context:t,t)})}},_={D50:[.3457/.3585,1,.2958/.3585],D65:[.3127/.329,1,.3583/.329]};function v(e){return Array.isArray(e)?e:_[e]}function y(e,t,r,i={}){if(e=v(e),t=v(t),!e||!t)throw TypeError(`Missing white point to convert ${e?``:`from`}${!e&&!t?`/`:``}${t?``:`to`}`);if(e===t)return r;let a={W1:e,W2:t,XYZ:r,options:i};if(g.run(`chromatic-adaptation-start`,a),a.M||(a.W1===_.D65&&a.W2===_.D50?a.M=[[1.0479297925449969,.022946870601609652,-.05019226628920524],[.02962780877005599,.9904344267538799,-.017073799063418826],[-.009243040646204504,.015055191490298152,.7518742814281371]]:a.W1===_.D50&&a.W2===_.D65&&(a.M=[[.955473421488075,-.02309845494876471,.06325924320057072],[-.0283697093338637,1.0099953980813041,.021041441191917323],[.012314014864481998,-.020507649298898964,1.330365926242124]])),g.run(`chromatic-adaptation-end`,a),a.M)return n(a.XYZ,a.M);throw TypeError(`Only Bradford CAT with white points D50 and D65 supported for now.`)}var b={gamut_mapping:`css`,precision:5,deltaE:`76`,verbose:globalThis?.process?.env?.NODE_ENV?.toLowerCase()!==`test`,warn:function(e){this.verbose&&globalThis?.console?.warn?.(e)}};function x(e,t){let n={str:String(e)?.trim(),options:t};if(g.run(`parse-start`,n),n.color)return n.color;n.parsed=T(n.str);let r,i=n.options?n.options.parseMeta??n.options.meta:null;if(n.parsed){let t=n.parsed.name,a,o,s=n.parsed.args,c=s.map((e,t)=>n.parsed.argMeta[t]?.type);if(t===`color`){let r=s.shift();c.shift();let i=r.startsWith(`--`)?r.substring(2):`--${r}`,l=[r,i];if(a=O.findFormat({name:t,id:l,type:`function`}),!a){let t,a=r in O.registry?r:i;if(a in O.registry){let n=O.registry[a].formats?.color?.id;n&&(t=`Did you mean ${e.replace(`color(`+r,`color(`+n)}?`)}throw TypeError(`Cannot parse ${n.str}. `+(t??`Missing a plugin?`))}o=a.space,a.id.startsWith(`--`)&&!r.startsWith(`--`)&&b.warn(`${o.name} is a non-standard space and not currently supported in the CSS spec. Use prefixed color(${a.id}) instead of color(${r}).`),r.startsWith(`--`)&&!a.id.startsWith(`--`)&&b.warn(`${o.name} is a standard space and supported in the CSS spec. Use color(${a.id}) instead of prefixed color(${r}).`)}else a=O.findFormat({name:t,type:`function`}),o=a.space;i&&Object.assign(i,{format:a,formatId:a.name,types:c,commas:n.parsed.commas});let l=1;n.parsed.lastAlpha&&(l=n.parsed.args.pop(),i&&(i.alphaType=c.pop()));let u=a.coords.length;if(s.length!==u)throw TypeError(`Expected ${u} coordinates for ${o.id} in ${n.str}), got ${s.length}`);s=a.coerceCoords(s,c),r={spaceId:o.id,coords:s,alpha:l}}else spaceloop:for(let e of O.all)for(let t in e.formats){let a=e.formats[t];if(a.type!==`custom`||a.test&&!a.test(n.str))continue;let o=e.getFormat(a),s=o.parse(n.str);if(s){i&&Object.assign(i,{format:o,formatId:t}),r=s;break spaceloop}}if(!r)throw TypeError(`Could not parse ${e} as a color. Missing a plugin?`);return r.alpha=o(r.alpha)?r.alpha:r.alpha===void 0?1:d(0,r.alpha,1),r}var S={"%":.01,deg:1,grad:.9,rad:180/Math.PI,turn:360},C={function:/^([a-z]+)\(((?:calc\(NaN\)|.)+?)\)$/i,number:/^([-+]?(?:[0-9]*\.)?[0-9]+(e[-+]?[0-9]+)?)$/i,unitValue:RegExp(`(${Object.keys(S).join(`|`)})$`),singleArgument:/\/?\s*(none|NaN|calc\(NaN\)|[-+\w.]+(?:%|deg|g?rad|turn)?)/g};function w(e){let t={},n=e.match(C.unitValue)?.[0],r=t.raw=e;return n?(t.type=n===`%`?`<percentage>`:`<angle>`,t.unit=n,t.unitless=Number(r.slice(0,-n.length)),r=t.unitless*S[n]):C.number.test(r)?(r=Number(r),t.type=`<number>`):r===`none`?r=null:r===`NaN`||r===`calc(NaN)`?(r=NaN,t.type=`<number>`):t.type=`<ident>`,{value:r,meta:t}}function T(e){if(!e)return;e=e.trim();let t=e.match(C.function);if(t){let e=[],n=[],r=!1,i=t[1].toLowerCase(),a=t[2].replace(C.singleArgument,(t,a)=>{let{value:o,meta:s}=w(a);return(t.startsWith(`/`)||i!==`color`&&e.length===3)&&(r=!0),e.push(o),n.push(s),``});return{name:i,args:e,argMeta:n,lastAlpha:r,commas:a.includes(`,`),rawName:t[1],rawArgs:t[2]}}}function E(e,t){if(Array.isArray(e))return e.map(e=>E(e,t));if(!e)throw TypeError(`Empty color reference`);r(e)&&(e=x(e,t));let n=e.space||e.spaceId;return typeof n==`string`&&(e.space=O.get(n)),e.alpha===void 0&&(e.alpha=1),e}var D=75e-6,O=class e{constructor(t){this.id=t.id,this.name=t.name,this.base=t.base?e.get(t.base):null,this.aliases=t.aliases,this.displaySpaces=t.displaySpaces?.map(t=>e.get(t)),this.bases=[];for(let e=this.base;e;e=e.base)this.bases.push(e);t.rgbGamut&&(this.rgbGamut=t.rgbGamut),t.linearGamut&&(this.linearGamut=t.linearGamut),this.base&&(t.fromBase&&(this.fromBase=t.fromBase),t.toBase&&(this.toBase=t.toBase));let n=t.coords??this.base.coords;for(let e in n)`name`in n[e]||(n[e].name=e);this.coords=n;let r=t.white??this.base.white??`D65`;this.white=v(r),this.formats=t.formats??{};for(let e in this.formats){let t=this.formats[e];t.type||=`function`,t.name||=e}this.formats.color?.id||(this.formats.color={...this.formats.color??{},id:t.cssId||this.id}),t.gamutSpace?this.gamutSpace=t.gamutSpace===`self`?this:e.get(t.gamutSpace):this.isPolar?this.gamutSpace=this.base:this.gamutSpace=this,this.gamutSpace.isUnbounded&&(this.inGamut=(e,t)=>!0),this.M=t.M??{},this.referred=t.referred,Object.defineProperty(this,"path",{value:ee(this).reverse(),writable:!1,enumerable:!0,configurable:!0}),g.run(`colorspace-init-end`,this)}inGamut(e,{epsilon:t=D}={}){if(!this.equals(this.gamutSpace))return e=this.to(this.gamutSpace,e),this.gamutSpace.inGamut(e,{epsilon:t});let n=Object.values(this.coords);return e.every((e,r)=>{let i=n[r];if(i.type!==`angle`&&i.range){if(o(e))return!0;let[n,r]=i.range;return(n===void 0||e>=n-t)&&(r===void 0||e<=r+t)}return!0})}get isUnbounded(){return Object.values(this.coords).every(e=>!(`range`in e))}get cssId(){return this.formats?.color?.id||this.id}get hueId(){for(let e in this.coords)if(this.coords[e].type===`angle`)return e;return null}get hueIndex(){return Object.keys(this.coords).findIndex(e=>this.coords[e].type===`angle`)}get isPolar(){return this.hueId!==null}getFormat(e){if(!e)return null;e==="default"?e=Object.values(this.formats)[0]:typeof e==`string`&&(e=this.formats[e]);let t=h.get(e,this);return t!==e&&e.name in this.formats&&(this.formats[e.name]=t),t}equals(e){return e?this===e||this.id===e||this.id===e.id:!1}to(t,n){if(arguments.length===1){let e=E(t);[t,n]=[e.space,e.coords]}if(t=e.get(t),this.equals(t))return n;n=n.map(e=>o(e)?0:e);let r=this.path,i=t.path,a,s;for(let e=0;e<r.length&&r[e].equals(i[e]);e++)a=r[e],s=e;if(!a)throw Error(`Cannot convert between color spaces ${this} and ${t}: no connection space was found`);for(let e=r.length-1;e>s;e--)n=r[e].toBase(n);for(let e=s+1;e<i.length;e++)n=i[e].fromBase(n);return n}from(t,n){if(arguments.length===1){let e=E(t);[t,n]=[e.space,e.coords]}return t=e.get(t),t.to(this,n)}toString(){return`${this.name} (${this.id})`}getMinCoords(){let e=[];for(let t in this.coords){let n=this.coords[t],r=n.range||n.refRange;e.push(r?.min??0)}return e}static registry={};static get all(){return[...new Set(Object.values(e.registry))]}static register(e,t){if(arguments.length===1&&(t=arguments[0],e=t.id),t=this.get(t),this.registry[e]&&this.registry[e]!==t)throw Error(`Duplicate color space registration: '${e}'`);if(this.registry[e]=t,arguments.length===1&&t.aliases)for(let e of t.aliases)this.register(e,t);return t}static get(t,...n){if(!t||f(t,this))return t;if(i(t)===`string`){let n=e.registry[t.toLowerCase()];if(!n)throw TypeError(`No color space found with id = "${t}"`);return n}if(n.length)return e.get(...n);throw TypeError(`${t} is not a valid color space`)}static findFormat(t,n=e.all){if(!t)return null;typeof t==`string`&&(t={name:t});for(let e of n)for(let[n,r]of Object.entries(e.formats)){r.name??=n,r.type??=`function`;let i=(!t.name||r.name===t.name)&&(!t.type||r.type===t.type);if(t.id){let e=r.ids||[r.id],n=Array.isArray(t.id)?t.id:[t.id];i&&=n.some(t=>e.includes(t))}if(i){let t=h.get(r,e);return t!==r&&(e.formats[r.name]=t),t}}return null}static resolveCoord(t,n){let r=i(t),a,o;if(r===`string`?t.includes(`.`)?[a,o]=t.split(`.`):[a,o]=[,t]:Array.isArray(t)?[a,o]=t:(a=t.space,o=t.coordId),a=e.get(a),a||=n,!a)throw TypeError(`Cannot resolve coordinate reference ${t}: No color space specified and relative references are not allowed here`);if(r=i(o),r===`number`||r===`string`&&o>=0){let e=Object.entries(a.coords)[o];if(e)return{space:a,id:e[0],index:o,...e[1]}}a=e.get(a);let s=o.toLowerCase(),c=0;for(let e in a.coords){let t=a.coords[e];if(e.toLowerCase()===s||t.name?.toLowerCase()===s)return{space:a,id:e,index:c,...t};c++}throw TypeError(`No "${o}" coordinate found in ${a.name}. Its coordinates are: ${Object.keys(a.coords).join(`, `)}`)}static DEFAULT_FORMAT={type:`functions`,name:`color`}};function ee(e){let t=[e];for(let n=e;n=n.base;)t.push(n);return t}var k=new O({id:`xyz-d65`,name:`XYZ D65`,coords:{x:{refRange:[0,1],name:`X`},y:{refRange:[0,1],name:`Y`},z:{refRange:[0,1],name:`Z`}},white:`D65`,formats:{color:{ids:[`xyz-d65`,`xyz`]}},aliases:[`xyz`]}),A=class extends O{constructor(e){e.coords||={r:{range:[0,1],name:`Red`},g:{range:[0,1],name:`Green`},b:{range:[0,1],name:`Blue`}},e.base||=k;let t=e.toXYZ_M??e.M?.toXYZ,n=e.fromXYZ_M??e.M?.fromXYZ;e.referred??=`display`,super(e),t&&n&&(this.M.toXYZ=t,this.M.fromXYZ=n)}toBase(e){let t=n(e,this.M.toXYZ);return this.white!==this.base.white&&(t=y(this.white,this.base.white,t)),t}fromBase(e){return e=y(this.base.white,this.white,e),n(e,this.M.fromXYZ)}},j=new O({id:`xyz-d50`,name:`XYZ D50`,white:`D50`,base:k,fromBase:e=>y(k.white,`D50`,e),toBase:e=>y(`D50`,k.white,e)}),M=216/24389,N=24/116,P=24389/27,F=_.D50,I=new O({id:`lab`,name:`Lab`,coords:{l:{refRange:[0,100],name:`Lightness`},a:{refRange:[-125,125]},b:{refRange:[-125,125]}},white:F,base:j,fromBase(e){let t=e.map((e,t)=>e/F[t]).map(e=>e>M?Math.cbrt(e):(P*e+16)/116);return[116*t[1]-16,500*(t[0]-t[1]),200*(t[1]-t[2])]},toBase(e){let[t,n,r]=e,i=[];return i[1]=(t+16)/116,i[0]=n/500+i[1],i[2]=i[1]-r/200,[i[0]>N?i[0]**3:(116*i[0]-16)/P,e[0]>8?((e[0]+16)/116)**3:e[0]/P,i[2]>N?i[2]**3:(116*i[2]-16)/P].map((e,t)=>e*F[t])},formats:{lab:{coords:[`<percentage> | <number>`,`<number> | <percentage>`,`<number> | <percentage>`]}}});function te(e){return typeof e==`number`?(e%360+360)%360:e}var L=new O({id:`lch`,name:`LCH`,coords:{l:{refRange:[0,100],name:`Lightness`},c:{refRange:[0,150],name:`Chroma`},h:{refRange:[0,360],type:`angle`,name:`Hue`}},base:I,fromBase(e){if(this.ε===void 0){let e=Object.values(this.base.coords)[1].refRange,t=e[1]-e[0];this.ε=t/1e5}let[t,n,r]=e,i=Math.abs(n)<this.ε&&Math.abs(r)<this.ε,a=i?null:te(Math.atan2(r,n)*180/Math.PI);return[t,i?0:Math.sqrt(n**2+r**2),a]},toBase(e){let[t,n,r]=e,i=null,a=null;return o(r)||(n=n<0?0:n,i=n*Math.cos(r*Math.PI/180),a=n*Math.sin(r*Math.PI/180)),[t,i,a]},formats:{lch:{coords:[`<percentage> | <number>`,`<number> | <percentage>`,`<number> | <angle>`]}}}),R={XYZtoLMS:[[.819022437996703,.3619062600528904,-.1288737815209879],[.0329836539323885,.9292868615863434,.0361446663506424],[.0481771893596242,.2642395317527308,.6335478284694309]],LMStoXYZ:[[1.2268798758459243,-.5578149944602171,.2813910456659647],[-.0405757452148008,1.112286803280317,-.0717110580655164],[-.0763729366746601,-.4214933324022432,1.5869240198367816]],LMStoLab:[[.210454268309314,.7936177747023054,-.0040720430116193],[1.9779985324311684,-2.42859224204858,.450593709617411],[.0259040424655478,.7827717124575296,-.8086757549230774]],LabtoLMS:[[1,.3963377773761749,.2158037573099136],[1,-.1055613458156586,-.0638541728258133],[1,-.0894841775298119,-1.2914855480194092]]},z=new O({id:`oklab`,name:`Oklab`,coords:{l:{refRange:[0,1],name:`Lightness`},a:{refRange:[-.4,.4]},b:{refRange:[-.4,.4]}},white:`D65`,base:k,M:R,fromBase(e){let t=n(e,R.XYZtoLMS);return t[0]=Math.cbrt(t[0]),t[1]=Math.cbrt(t[1]),t[2]=Math.cbrt(t[2]),n(t,R.LMStoLab,t)},toBase(e){let t=n(e,R.LabtoLMS);return t[0]**=3,t[1]**=3,t[2]**=3,n(t,R.LMStoXYZ,t)},formats:{oklab:{coords:[`<percentage> | <number>`,`<number> | <percentage>`,`<number> | <percentage>`]}}}),B=75e-6;function ne(e,t,{epsilon:n=B}={}){e=E(e),t||=e.space,t=O.get(t);let r=e.coords;return t!==e.space&&(r=t.from(e)),t.inGamut(r,{epsilon:n})}function V(e,t){e=E(e);let n=O.get(t,t?.space),r=t?.precision,i;return i=!n||e.space.equals(n)?e.coords.slice():n.from(e),r===void 0?i:i.map(e=>s(e,r))}function re(e,t){if(e=E(e),t===`alpha`)return e.alpha??1;let{space:n,index:r}=O.resolveCoord(t,e.space);return V(e,n)[r]}var ie=new O({id:`oklch`,name:`OkLCh`,coords:{l:{refRange:[0,1],name:`Lightness`},c:{refRange:[0,.4],name:`Chroma`},h:{refRange:[0,360],type:`angle`,name:`Hue`}},white:`D65`,base:z,fromBase:L.fromBase,toBase:L.toBase,formats:{oklch:{coords:[`<percentage> | <number>`,`<number> | <percentage>`,`<number> | <angle>`]}}}),H=new A({id:`rec2020-linear`,cssId:`--rec2020-linear`,name:`Linear REC.2020`,white:`D65`,M:{toXYZ:[[.6369580483012914,.14461690358620832,.1688809751641721],[.2627002120112671,.6779980715188708,.05930171646986196],[0,.028072693049087428,1.060985057710791]],fromXYZ:[[1.716651187971268,-.355670783776392,-.25336628137366],[-.666684351832489,1.616481236634939,.0157685458139111],[.017639857445311,-.042770613257809,.942103121235474]]}}),ae=new A({id:`rec2020`,name:`REC.2020`,base:H,linearGamut:H,toBase(e){return e.map(function(e){let t=e<0?-1:1;return t*(e*t)**2.4})},fromBase(e){return e.map(function(e){let t=e<0?-1:1;return t*(e*t)**(1/2.4)})}}),U=new A({id:`p3-linear`,cssId:`display-p3-linear`,name:`Linear P3`,white:`D65`,M:{toXYZ:[[.4865709486482162,.26566769316909306,.1982172852343625],[.2289745640697488,.6917385218365064,.079286914093745],[0,.04511338185890264,1.043944368900976]],fromXYZ:[[2.493496911941425,-.9313836179191239,-.40271078445071684],[-.8294889695615747,1.7626640603183463,.023624685841943577],[.03584583024378447,-.07617238926804182,.9568845240076872]]}}),W=new A({id:`srgb-linear`,name:`Linear sRGB`,white:`D65`,M:{toXYZ:[[.41239079926595934,.357584339383878,.1804807884018343],[.21263900587151027,.715168678767756,.07219231536073371],[.01933081871559182,.11919477979462598,.9505321522496607]],fromXYZ:[[3.2409699419045226,-1.537383177570094,-.4986107602930034],[-.9692436362808796,1.8759675015077202,.04155505740717559],[.05563007969699366,-.20397695888897652,1.0569715142428786]]}}),G={aliceblue:[240/255,248/255,1],antiquewhite:[250/255,235/255,215/255],aqua:[0,1,1],aquamarine:[127/255,1,212/255],azure:[240/255,1,1],beige:[245/255,245/255,220/255],bisque:[1,228/255,196/255],black:[0,0,0],blanchedalmond:[1,235/255,205/255],blue:[0,0,1],blueviolet:[138/255,43/255,226/255],brown:[165/255,42/255,42/255],burlywood:[222/255,184/255,135/255],cadetblue:[95/255,158/255,160/255],chartreuse:[127/255,1,0],chocolate:[210/255,105/255,30/255],coral:[1,127/255,80/255],cornflowerblue:[100/255,149/255,237/255],cornsilk:[1,248/255,220/255],crimson:[220/255,20/255,60/255],cyan:[0,1,1],darkblue:[0,0,139/255],darkcyan:[0,139/255,139/255],darkgoldenrod:[184/255,134/255,11/255],darkgray:[169/255,169/255,169/255],darkgreen:[0,100/255,0],darkgrey:[169/255,169/255,169/255],darkkhaki:[189/255,183/255,107/255],darkmagenta:[139/255,0,139/255],darkolivegreen:[85/255,107/255,47/255],darkorange:[1,140/255,0],darkorchid:[153/255,50/255,204/255],darkred:[139/255,0,0],darksalmon:[233/255,150/255,122/255],darkseagreen:[143/255,188/255,143/255],darkslateblue:[72/255,61/255,139/255],darkslategray:[47/255,79/255,79/255],darkslategrey:[47/255,79/255,79/255],darkturquoise:[0,206/255,209/255],darkviolet:[148/255,0,211/255],deeppink:[1,20/255,147/255],deepskyblue:[0,191/255,1],dimgray:[105/255,105/255,105/255],dimgrey:[105/255,105/255,105/255],dodgerblue:[30/255,144/255,1],firebrick:[178/255,34/255,34/255],floralwhite:[1,250/255,240/255],forestgreen:[34/255,139/255,34/255],fuchsia:[1,0,1],gainsboro:[220/255,220/255,220/255],ghostwhite:[248/255,248/255,1],gold:[1,215/255,0],goldenrod:[218/255,165/255,32/255],gray:[128/255,128/255,128/255],green:[0,128/255,0],greenyellow:[173/255,1,47/255],grey:[128/255,128/255,128/255],honeydew:[240/255,1,240/255],hotpink:[1,105/255,180/255],indianred:[205/255,92/255,92/255],indigo:[75/255,0,130/255],ivory:[1,1,240/255],khaki:[240/255,230/255,140/255],lavender:[230/255,230/255,250/255],lavenderblush:[1,240/255,245/255],lawngreen:[124/255,252/255,0],lemonchiffon:[1,250/255,205/255],lightblue:[173/255,216/255,230/255],lightcoral:[240/255,128/255,128/255],lightcyan:[224/255,1,1],lightgoldenrodyellow:[250/255,250/255,210/255],lightgray:[211/255,211/255,211/255],lightgreen:[144/255,238/255,144/255],lightgrey:[211/255,211/255,211/255],lightpink:[1,182/255,193/255],lightsalmon:[1,160/255,122/255],lightseagreen:[32/255,178/255,170/255],lightskyblue:[135/255,206/255,250/255],lightslategray:[119/255,136/255,153/255],lightslategrey:[119/255,136/255,153/255],lightsteelblue:[176/255,196/255,222/255],lightyellow:[1,1,224/255],lime:[0,1,0],limegreen:[50/255,205/255,50/255],linen:[250/255,240/255,230/255],magenta:[1,0,1],maroon:[128/255,0,0],mediumaquamarine:[102/255,205/255,170/255],mediumblue:[0,0,205/255],mediumorchid:[186/255,85/255,211/255],mediumpurple:[147/255,112/255,219/255],mediumseagreen:[60/255,179/255,113/255],mediumslateblue:[123/255,104/255,238/255],mediumspringgreen:[0,250/255,154/255],mediumturquoise:[72/255,209/255,204/255],mediumvioletred:[199/255,21/255,133/255],midnightblue:[25/255,25/255,112/255],mintcream:[245/255,1,250/255],mistyrose:[1,228/255,225/255],moccasin:[1,228/255,181/255],navajowhite:[1,222/255,173/255],navy:[0,0,128/255],oldlace:[253/255,245/255,230/255],olive:[128/255,128/255,0],olivedrab:[107/255,142/255,35/255],orange:[1,165/255,0],orangered:[1,69/255,0],orchid:[218/255,112/255,214/255],palegoldenrod:[238/255,232/255,170/255],palegreen:[152/255,251/255,152/255],paleturquoise:[175/255,238/255,238/255],palevioletred:[219/255,112/255,147/255],papayawhip:[1,239/255,213/255],peachpuff:[1,218/255,185/255],peru:[205/255,133/255,63/255],pink:[1,192/255,203/255],plum:[221/255,160/255,221/255],powderblue:[176/255,224/255,230/255],purple:[128/255,0,128/255],rebeccapurple:[102/255,51/255,153/255],red:[1,0,0],rosybrown:[188/255,143/255,143/255],royalblue:[65/255,105/255,225/255],saddlebrown:[139/255,69/255,19/255],salmon:[250/255,128/255,114/255],sandybrown:[244/255,164/255,96/255],seagreen:[46/255,139/255,87/255],seashell:[1,245/255,238/255],sienna:[160/255,82/255,45/255],silver:[192/255,192/255,192/255],skyblue:[135/255,206/255,235/255],slateblue:[106/255,90/255,205/255],slategray:[112/255,128/255,144/255],slategrey:[112/255,128/255,144/255],snow:[1,250/255,250/255],springgreen:[0,1,127/255],steelblue:[70/255,130/255,180/255],tan:[210/255,180/255,140/255],teal:[0,128/255,128/255],thistle:[216/255,191/255,216/255],tomato:[1,99/255,71/255],turquoise:[64/255,224/255,208/255],violet:[238/255,130/255,238/255],wheat:[245/255,222/255,179/255],white:[1,1,1],whitesmoke:[245/255,245/255,245/255],yellow:[1,1,0],yellowgreen:[154/255,205/255,50/255]},K=[,,,].fill(`<percentage> | <number>[0, 255]`),q=[,,,].fill(`<number>[0, 255]`),J=new A({id:`srgb`,name:`sRGB`,base:W,linearGamut:W,fromBase:e=>e.map(e=>{let t=e<0?-1:1,n=e*t;return n>.0031308?t*(1.055*n**(1/2.4)-.055):12.92*e}),toBase:e=>e.map(e=>{let t=e<0?-1:1,n=e*t;return n<=.04045?e/12.92:t*((n+.055)/1.055)**2.4}),formats:{rgb:{coords:K},rgb_number:{name:`rgb`,commas:!0,coords:q,alpha:!1},color:{},rgba:{coords:K,commas:!0,alpha:!0},rgba_number:{name:`rgba`,commas:!0,coords:q},hex:{type:`custom`,toGamut:!0,test:e=>/^#(([a-f0-9]{2}){3,4}|[a-f0-9]{3,4})$/i.test(e),parse(e){e.length<=5&&(e=e.replace(/[a-f0-9]/gi,`$&$&`));let t=[];return e.replace(/[a-f0-9]{2}/gi,e=>{t.push(parseInt(e,16)/255)}),{spaceId:`srgb`,coords:t.slice(0,3),alpha:t.slice(3)[0]}},serialize:(e,t,{collapse:n=!0,alpha:r}={})=>{(r!==!1&&t<1||r===!0)&&e.push(t),e=e.map(e=>Math.round(e*255));let i=n&&e.every(e=>e%17==0);return`#`+e.map(e=>i?(e/17).toString(16):e.toString(16).padStart(2,`0`)).join(``)}},keyword:{type:`custom`,test:e=>/^[a-z]+$/i.test(e),parse(e){e=e.toLowerCase();let t={spaceId:`srgb`,coords:null,alpha:1};if(e===`transparent`?(t.coords=G.black,t.alpha=0):t.coords=G[e],t.coords)return t}}}}),oe=new A({id:`p3`,cssId:`display-p3`,name:`P3`,base:U,linearGamut:U,fromBase:J.fromBase,toBase:J.toBase});function Y(e){return re(e,[k,`y`])}function se(e,t){e=E(e),t=E(t);let n=Math.max(Y(e),0),r=Math.max(Y(t),0);return r>n&&([n,r]=[r,n]),(n+.05)/(r+.05)}var ce=new O({id:`hsl`,name:`HSL`,coords:{h:{refRange:[0,360],type:`angle`,name:`Hue`},s:{range:[0,100],name:`Saturation`},l:{range:[0,100],name:`Lightness`}},base:J,rgbGamut:J,fromBase:e=>{let t=Math.max(...e),n=Math.min(...e),[r,i,a]=e,[o,s,c]=[null,0,(n+t)/2],l=t-n;if(l!==0){switch(s=c===0||c===1?0:(t-c)/Math.min(c,1-c),t){case r:o=(i-a)/l+(i<a?6:0);break;case i:o=(a-r)/l+2;break;case a:o=(r-i)/l+4}o*=60}return s<0&&(o+=180,s=Math.abs(s)),o>=360&&(o-=360),[o,s*100,c*100]},toBase:e=>{let[t,n,r]=e;t%=360,t<0&&(t+=360),n/=100,r/=100;function i(e){let i=(e+t/30)%12,a=n*Math.min(r,1-r);return r-a*Math.max(-1,Math.min(i-3,9-i,1))}return[i(0),i(8),i(4)]},formats:{hsl:{coords:[`<number> | <angle>`,`<percentage> | <number>`,`<percentage> | <number>`]},hsla:{coords:[`<number> | <angle>`,`<percentage> | <number>`,`<percentage> | <number>`],commas:!0,alpha:!0}}}),le=new O({id:`hwb`,name:`HWB`,coords:{h:{refRange:[0,360],type:`angle`,name:`Hue`},w:{range:[0,100],name:`Whiteness`},b:{range:[0,100],name:`Blackness`}},base:new O({id:`hsv`,name:`HSV`,coords:{h:{refRange:[0,360],type:`angle`,name:`Hue`},s:{range:[0,100],name:`Saturation`},v:{range:[0,100],name:`Value`}},base:J,rgbGamut:J,fromBase(e){let t=Math.max(...e),n=Math.min(...e),[r,i,a]=e,[o,s,c]=[null,0,t],l=t-n;if(l!==0){switch(t){case r:o=(i-a)/l+(i<a?6:0);break;case i:o=(a-r)/l+2;break;case a:o=(r-i)/l+4}o*=60}return c&&(s=l/c),o>=360&&(o-=360),[o,s*100,c*100]},toBase(e){let[t,n,r]=e;t%=360,t<0&&(t+=360),n/=100,r/=100;function i(e){let i=(e+t/60)%6;return r-r*n*Math.max(0,Math.min(i,4-i,1))}return[i(5),i(3),i(1)]},formats:{color:{id:`--hsv`,coords:[`<number> | <angle>`,`<percentage> | <number>`,`<percentage> | <number>`]}}}),rgbGamut:J,fromBase(e){let[t,n,r]=e;return[t,r*(100-n)/100,100-r]},toBase(e){let[t,n,r]=e;n/=100,r/=100;let i=n+r;if(i>=1)return[t,0,n/i*100];let a=1-r;return[t,(a===0?0:1-n/a)*100,a*100]},formats:{hwb:{coords:[`<number> | <angle>`,`<percentage> | <number>`,`<percentage> | <number>`]}}}),X=new A({id:`a98rgb-linear`,cssId:`--a98-rgb-linear`,name:`Linear Adobe® 98 RGB compatible`,white:`D65`,M:{toXYZ:[[.5766690429101305,.1855582379065463,.1882286462349947],[.29734497525053605,.6273635662554661,.07529145849399788],[.02703136138641234,.07068885253582723,.9913375368376388]],fromXYZ:[[2.0415879038107465,-.5650069742788596,-.34473135077832956],[-.9692436362808795,1.8759675015077202,.04155505740717557],[.013444280632031142,-.11836239223101838,1.0151749943912054]]}}),ue=new A({id:`a98rgb`,cssId:`a98-rgb`,name:`Adobe® 98 RGB compatible`,base:X,linearGamut:X,toBase:e=>e.map(e=>Math.abs(e)**(563/256)*Math.sign(e)),fromBase:e=>e.map(e=>Math.abs(e)**(256/563)*Math.sign(e))}),Z=new A({id:`prophoto-linear`,cssId:`--prophoto-rgb-linear`,name:`Linear ProPhoto`,white:`D50`,base:j,M:{toXYZ:[[.7977666449006423,.13518129740053308,.0313477341283922],[.2880748288194013,.711835234241873,8993693872564e-17],[0,0,.8251046025104602]],fromXYZ:[[1.3457868816471583,-.25557208737979464,-.05110186497554526],[-.5446307051249019,1.5082477428451468,.02052744743642139],[0,0,1.2119675456389452]]}}),de=1/512,fe=16/512,pe=[J,W,ce,le,I,L,z,ie,oe,ue,new A({id:`prophoto`,cssId:`prophoto-rgb`,name:`ProPhoto`,base:Z,linearGamut:Z,toBase(e){return e.map(e=>{let t=e<0?-1:1,n=e*t;return n<fe?e/16:t*n**1.8})},fromBase(e){return e.map(e=>{let t=e<0?-1:1,n=e*t;return n>=de?t*n**(1/1.8):16*e})}}),ae,j,k];function me(){for(let e of pe)O.registry[e.id]===void 0&&O.register(e)}function Q(e){return me(),x(e)}function $(e){return ne(e,`srgb`)}function he(e){let t=Q(e);if(t.alpha!==1||!$(t))throw Error(`UI status colors require opaque sRGB values.`);return`rgba(${V(t,`srgb`).map(t=>{if(t===null||!Number.isFinite(t))throw Error(`UI status color ${e} has an invalid sRGB channel: ${String(t)}.`);let n=Math.round(t*255);if(n<0||n>255)throw Error(`UI status color ${e} cannot be represented as integer sRGB.`);return n}).join(`, `)}, 1)`}function ge(e,t){return se(e,t)}return e.calculateWcag21Contrast=ge,e.formatOpaqueSrgbColor=he,e.isInSrgbGamut=$,e.parseCssColor=Q,e})({});

  function location(contents, index) {
    const prefix = contents.slice(0, index);
    const line = prefix.split('\n').length;
    const lastNewline = prefix.lastIndexOf('\n');
    const column = index - lastNewline;
    return `${String(line)}:${String(column)}`;
}
function parseJsonSource(contents, sourcePath) {
    let index = 0;
    function fail(message, at = index) {
        throw new Error(`${sourcePath}:${location(contents, at)} ${message}`);
    }
    function skipWhitespace() {
        while (/\s/u.test(contents[index] ?? '')) {
            index += 1;
        }
    }
    function parseString() {
        const start = index;
        if (contents[index] !== '"') {
            fail('Expected a JSON string.');
        }
        index += 1;
        while (index < contents.length) {
            const character = contents[index];
            if (character === '"') {
                index += 1;
                try {
                    const parsed = JSON.parse(contents.slice(start, index));
                    if (typeof parsed !== 'string') {
                        fail('Expected a JSON string.', start);
                    }
                    return parsed;
                }
                catch {
                    fail('Invalid JSON string escape sequence.', start);
                }
            }
            if (character === '\\') {
                index += 2;
            }
            else {
                index += 1;
            }
        }
        fail('Unterminated JSON string.', start);
    }
    function parseNumber() {
        const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(contents.slice(index));
        if (match === null) {
            fail('Invalid JSON number.');
        }
        index += match[0].length;
        const value = Number(match[0]);
        if (!Number.isFinite(value)) {
            fail('JSON numbers must be finite.', index - match[0].length);
        }
        return value;
    }
    function parseLiteral(literal, value) {
        if (!contents.startsWith(literal, index)) {
            fail(`Expected "${literal}".`);
        }
        index += literal.length;
        return value;
    }
    function parseArray(path) {
        const values = [];
        index += 1;
        skipWhitespace();
        if (contents[index] === ']') {
            index += 1;
            return values;
        }
        while (index < contents.length) {
            values.push(parseValue([...path, String(values.length)]));
            skipWhitespace();
            if (contents[index] === ']') {
                index += 1;
                return values;
            }
            if (contents[index] !== ',') {
                fail('Expected "," or "]" in JSON array.');
            }
            index += 1;
            skipWhitespace();
        }
        fail('Unterminated JSON array.');
    }
    function parseObject(path) {
        const value = {};
        const keys = new Set();
        index += 1;
        skipWhitespace();
        if (contents[index] === '}') {
            index += 1;
            return value;
        }
        while (index < contents.length) {
            const keyStart = index;
            const key = parseString();
            if (keys.has(key)) {
                fail(`Duplicate JSON object key "${[...path, key].join('.')}".`, keyStart);
            }
            keys.add(key);
            skipWhitespace();
            if (contents[index] !== ':') {
                fail('Expected ":" after JSON object key.');
            }
            index += 1;
            value[key] = parseValue([...path, key]);
            skipWhitespace();
            if (contents[index] === '}') {
                index += 1;
                return value;
            }
            if (contents[index] !== ',') {
                fail('Expected "," or "}" in JSON object.');
            }
            index += 1;
            skipWhitespace();
        }
        fail('Unterminated JSON object.');
    }
    function parseValue(path) {
        skipWhitespace();
        const character = contents[index];
        if (character === '{') {
            return parseObject(path);
        }
        if (character === '[') {
            return parseArray(path);
        }
        if (character === '"') {
            return parseString();
        }
        if (character === '-' || (character !== undefined && /\d/u.test(character))) {
            return parseNumber();
        }
        if (character === 't') {
            return parseLiteral('true', true);
        }
        if (character === 'f') {
            return parseLiteral('false', false);
        }
        if (character === 'n') {
            return parseLiteral('null', null);
        }
        fail('Expected a JSON value.');
    }
    const value = parseValue([]);
    skipWhitespace();
    if (index !== contents.length) {
        fail('Unexpected content after the JSON value.');
    }
    return value;
}

  /** Shared by build, runtime and the generated synchronous first-paint initializer. */
function paletteContrastFailure(palette, _mode, textMinimum, boundaryMinimum, contrast) {
    let failure = null;
    function pair(foreground, background, minimum, name) {
        if (failure !== null)
            return;
        const ratio = contrast(foreground, background);
        if (!Number.isFinite(ratio) || ratio < minimum)
            failure = `${name}: contrast ${String(ratio)} is below ${String(minimum)}.`;
    }
    const surfaces = Object.entries(palette.surfaces);
    for (const [name, foreground] of Object.entries(palette.text))
        for (const [surface, background] of surfaces)
            pair(foreground, background, textMinimum, `text.${name}/${surface}`);
    for (const [surface, background] of surfaces)
        pair(palette.borders.control, background, boundaryMinimum, `control-border/${surface}`);
    for (const [name, role] of Object.entries(palette.roles)) {
        for (const [state, foreground] of Object.entries(role.foreground)) {
            for (const [surface, background] of surfaces)
                pair(foreground, background, textMinimum, `${name}.foreground.${state}/${surface}`);
            for (const [stateName, background] of Object.entries(role.soft.background))
                pair(foreground, background, textMinimum, `${name}.foreground.${state}/soft.${stateName}`);
        }
        for (const [state, background] of Object.entries(role.solid.background))
            pair(role.solid.foreground, background, textMinimum, `${name}.on-solid/${state}`);
        for (const [state, background] of Object.entries(role.soft.background)) {
            pair(role.soft.foreground, background, textMinimum, `${name}.on-soft/${state}`);
            pair(role.soft.icon, background, boundaryMinimum, `${name}.soft-icon/${state}`);
            pair(role.soft.border, background, boundaryMinimum, `${name}.soft-border/${state}`);
        }
        for (const [surface, background] of surfaces) {
            pair(role.focus, background, boundaryMinimum, `${name}.focus/${surface}`);
            pair(role.soft.border, background, boundaryMinimum, `${name}.border/${surface}`);
        }
        pair(role.disabled.foreground, role.disabled.background, textMinimum, `${name}.disabled`);
    }
    pair(palette.tooltip.foreground, palette.tooltip.background, textMinimum, 'tooltip');
    pair(palette.roles.neutral.solid.foreground, palette.roles.neutral.solid.background.default, textMinimum, 'switch.off-content');
    // Naive colored secondary buttons use the opaque soft role, validated above.
    return failure;
}


  var colorModes = ['light', 'dark', 'system']
  var themeColorModes = ['light', 'dark']
  var contrasts = ['standard', 'enhanced']
  var materials = ['adaptive', 'reduced', 'solid']
  var densities = ['compact', 'comfortable', 'spacious']
  var fontScales = [0.9, 1, 1.1, 1.2]
  var motions = ['full', 'reduced', 'none']
  var builtInThemeIds = ['royal-iris', 'cobalt-tide', 'emerald-grove', 'ember-coral', 'berry-bloom']
  var roleContractVersion = 4
  var themeSchemaVersion = 4
  var palettePlaneShape = {
  surfaces: {
    canvas: true,
    surface: true,
    raised: true,
    sunken: true,
  },
  roles: {
    primary: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
    info: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
    success: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
    warning: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
    error: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
    neutral: {
      foreground: {
        default: true,
        hover: true,
        pressed: true,
        suppl: true,
      },
      solid: {
        background: {
          default: true,
          hover: true,
          pressed: true,
          focus: true,
        },
        foreground: true,
        border: true,
      },
      soft: {
        background: {
          default: true,
          hover: true,
          pressed: true,
        },
        foreground: true,
        icon: true,
        border: true,
      },
      focus: true,
      disabled: {
        background: true,
        foreground: true,
        border: true,
      },
    },
  },
  text: {
    primary: true,
    secondary: true,
    muted: true,
    onSurface: true,
  },
  borders: {
    control: true,
    decorative: true,
  },
  tooltip: {
    background: true,
    foreground: true,
  },
}
  var publicRoleReferences = {
  light: {
    standard: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
    enhanced: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
  },
  dark: {
    standard: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
    enhanced: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
  },
}
  var paletteTextMinimum = [4.5, 7]
  var paletteBoundaryMinimum = [3, 3]
  var publicColorBindings = [['color.action.primary', '--ui-color-action-primary'], ['color.control.primary', '--ui-color-control-primary'], ['color.border.default', '--ui-color-border-default'], ['color.focus.ring', '--ui-color-focus-ring'], ['color.scrim.viewport', '--ui-color-scrim-viewport'], ['color.surface.page', '--ui-color-surface-page'], ['color.surface.panel', '--ui-color-surface-panel'], ['color.text.on-action', '--ui-color-text-on-action'], ['color.text.primary', '--ui-color-text-primary'], ['color.text.secondary', '--ui-color-text-secondary'], ['color.status.info', '--ui-color-status-info'], ['color.status.info.hover', '--ui-color-status-info-hover'], ['color.status.info.pressed', '--ui-color-status-info-pressed'], ['color.text.on-status.info', '--ui-color-text-on-status-info'], ['color.status.success', '--ui-color-status-success'], ['color.status.success.hover', '--ui-color-status-success-hover'], ['color.status.success.pressed', '--ui-color-status-success-pressed'], ['color.text.on-status.success', '--ui-color-text-on-status-success'], ['color.status.warning', '--ui-color-status-warning'], ['color.status.warning.hover', '--ui-color-status-warning-hover'], ['color.status.warning.pressed', '--ui-color-status-warning-pressed'], ['color.text.on-status.warning', '--ui-color-text-on-status-warning'], ['color.status.error', '--ui-color-status-error'], ['color.status.error.hover', '--ui-color-status-error-hover'], ['color.status.error.pressed', '--ui-color-status-error-pressed'], ['color.text.on-status.error', '--ui-color-text-on-status-error'], ['color.control.info', '--ui-color-control-info'], ['color.control.success', '--ui-color-control-success'], ['color.control.warning', '--ui-color-control-warning'], ['color.control.error', '--ui-color-control-error']]
  var activePublicColorRoles = publicColorBindings.map(function (record) { return record[0] })
  var namedContrasts = [['color.text.primary', 'color.surface.page', 4.5, 7, false], ['color.text.primary', 'color.surface.panel', 4.5, 7, false], ['color.text.secondary', 'color.surface.page', 4.5, 7, false], ['color.text.secondary', 'color.surface.panel', 4.5, 7, false], ['color.text.on-action', 'color.action.primary', 4.5, 7, false], ['color.focus.ring', 'color.surface.page', 3, 3, false], ['color.focus.ring', 'color.surface.panel', 3, 3, false], ['color.control.primary', 'color.surface.page', 3, 3, false], ['color.control.primary', 'color.surface.panel', 3, 3, false], ['color.border.default', 'color.surface.page', 3, 3, false], ['color.border.default', 'color.surface.panel', 3, 3, false], ['color.control.info', 'color.surface.page', 3, 3, false], ['color.control.success', 'color.surface.page', 3, 3, false], ['color.control.warning', 'color.surface.page', 3, 3, false], ['color.control.error', 'color.surface.page', 3, 3, false], ['color.control.info', 'color.surface.panel', 3, 3, false], ['color.control.success', 'color.surface.panel', 3, 3, false], ['color.control.warning', 'color.surface.panel', 3, 3, false], ['color.control.error', 'color.surface.panel', 3, 3, false], ['color.text.on-status.info', 'color.status.info', 4.5, 7, true], ['color.text.on-status.success', 'color.status.success', 4.5, 7, true], ['color.text.on-status.warning', 'color.status.warning', 4.5, 7, true], ['color.text.on-status.error', 'color.status.error', 4.5, 7, true], ['color.text.on-status.info', 'color.status.info.hover', 4.5, 7, true], ['color.text.on-status.success', 'color.status.success.hover', 4.5, 7, true], ['color.text.on-status.warning', 'color.status.warning.hover', 4.5, 7, true], ['color.text.on-status.error', 'color.status.error.hover', 4.5, 7, true], ['color.text.on-status.info', 'color.status.info.pressed', 4.5, 7, true], ['color.text.on-status.success', 'color.status.success.pressed', 4.5, 7, true], ['color.text.on-status.warning', 'color.status.warning.pressed', 4.5, 7, true], ['color.text.on-status.error', 'color.status.error.pressed', 4.5, 7, true]]
  var forbiddenColorKeywords = ['inherit', 'initial', 'revert', 'revert-layer', 'unset', 'accentcolor', 'accentcolortext', 'activeborder', 'activecaption', 'activetext', 'appworkspace', 'background', 'buttonborder', 'buttonface', 'buttonhighlight', 'buttonshadow', 'buttontext', 'canvas', 'canvastext', 'captiontext', 'field', 'fieldtext', 'graytext', 'highlight', 'highlighttext', 'inactiveborder', 'inactivecaption', 'inactivecaptiontext', 'infobackground', 'infotext', 'linktext', 'mark', 'marktext', 'menu', 'menutext', 'scrollbar', 'selecteditem', 'selecteditemtext', 'threeddarkshadow', 'threedface', 'threedhighlight', 'threedlightshadow', 'threedshadow', 'visitedtext', 'window', 'windowframe', 'windowtext']
  var supportedColorSyntax = new RegExp('^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|[a-z][a-z0-9-]*|(?:hsl|hsla|hwb|lab|lch|oklab|oklch|rgb|rgba)\\(.+\\)|color\\(\\s*srgb\\s+.+\\))$', 'iu')
  var forbiddenColorSyntax = new RegExp('\\b(?:attr|calc|color-mix|env|light-dark|var)\\s*\\(|\\bcurrentcolor\\b|\\(\\s*from\\b', 'iu')
  var radiusContract = {
  minimum: 0,
  maximum: 16,
  step: 1,
  defaultValue: 8,
  panelDefault: 12,
  smallDefault: 4,
}
/** Input validation belongs to the Appearance boundary; this is also used before Vue. */
function resolveRadius(radius, parameters) {
    return {
        control: radius,
        panel: Math.min((radius * parameters.panelDefault) / parameters.defaultValue, parameters.maximum),
        small: Math.min((radius * parameters.smallDefault) / parameters.defaultValue, parameters.smallDefault),
    };
}

function resolveMotion({ storedMotion, prefersReducedMotion, }) {
    return storedMotion === 'full' && prefersReducedMotion ? 'reduced' : storedMotion;
}

  var customBankRecords = themeColorModes.flatMap(function (colorMode) {
    return contrasts.flatMap(function (contrast) {
      return publicColorBindings.map(function (binding) {
        var colorPrefix = '--ui-color-'
        if (!binding[1].startsWith(colorPrefix)) throw new Error('Invalid Public Color binding')
        return {
          bankVariable: '--ui-theme-bank-' + colorMode + '-' + contrast + '-' + binding[1].slice(colorPrefix.length),
          colorMode: colorMode, contrast: contrast, publicRole: binding[0],
        }
      })
    })
  })
  var customBankVariables = customBankRecords.map(function (record) { return record.bankVariable })
  var appearanceAttributeNames = ['data-color-mode', 'data-theme-kind', 'data-theme', 'data-contrast', 'data-material', 'data-density', 'data-motion']
  var appearanceStylePropertyNames = ['--ui-font-scale', '--ui-radius-control', '--ui-radius-panel', '--ui-radius-small']
  var colorModeContract = {
    dark: 'dark',
    light: 'light',
    system: 'system',
  }
  var materialContract = {
    adaptive: 'adaptive',
    reduced: 'reduced',
    solid: 'solid',
  }

  function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function compareCodePoints(left, right) {
    return left < right ? -1 : left > right ? 1 : 0
  }

  function hasOnlyKeys(value, expectedKeys) {
    if (!isRecord(value)) {
      return false
    }

    var actualKeys = Object.keys(value).sort(compareCodePoints)
    var sortedExpectedKeys = expectedKeys.slice().sort(compareCodePoints)
    return actualKeys.join('\n') === sortedExpectedKeys.join('\n')
  }

  function includes(values, value) {
    return values.indexOf(value) !== -1
  }

  function isCssColor(value) {
    if (typeof value !== 'string') {
      return false
    }

    try {
      PavpFirstPaintColor.parseCssColor(value)
      return true
    } catch {
      return false
    }
  }

  function isThemeColor(roleId, value) {
    if (typeof value !== 'string' || value.trim() !== value ||
      !supportedColorSyntax.test(value) || forbiddenColorSyntax.test(value) ||
      includes(forbiddenColorKeywords, value.toLowerCase()) || !isCssColor(value)) {
      return false
    }

    try {
      var color = PavpFirstPaintColor.parseCssColor(value)
      var expectedAlpha = roleId === 'color.scrim.viewport' ? 0.56 : 1
      return color.alpha === expectedAlpha && PavpFirstPaintColor.isInSrgbGamut(color)
    } catch {
      return false
    }
  }

  function validatedCustomThemeDefinition(value) {
    if (
      !hasOnlyKeys(value, ['id', 'label', 'planes', 'roleContractVersion', 'schemaVersion', 'uiPalette']) ||
      value.schemaVersion !== themeSchemaVersion ||
      typeof value.id !== 'string' ||
      value.id.length === 0 ||
      typeof value.label !== 'string' ||
      value.label.length === 0 ||
      value.roleContractVersion !== roleContractVersion ||
      !hasOnlyKeys(value.planes, ['dark', 'light']) ||
      !hasOnlyKeys(value.uiPalette, ['dark', 'light'])
    ) {
      return null
    }

    var sourceRoles = activePublicColorRoles
    var normalizedPlanes = {}

    for (var colorModeIndex = 0; colorModeIndex < themeColorModes.length; colorModeIndex += 1) {
      var colorMode = themeColorModes[colorModeIndex]
      var modePlanes = value.planes[colorMode]
      var modePalettes = value.uiPalette[colorMode]

      if (!hasOnlyKeys(modePlanes, contrasts) || !hasOnlyKeys(modePalettes, contrasts)) {
        return null
      }

      normalizedPlanes[colorMode] = {}

      for (var contrastIndex = 0; contrastIndex < contrasts.length; contrastIndex += 1) {
        var contrast = contrasts[contrastIndex]
        var plane = modePlanes[contrast]
        var palette = modePalettes[contrast]

        if (!hasOnlyKeys(plane, sourceRoles) || !matchesPaletteShape(palette, palettePlaneShape)) {
          return null
        }

        var paletteFailure = paletteContrastFailure(palette, colorMode,
          paletteTextMinimum[contrastIndex], paletteBoundaryMinimum[contrastIndex],
          function (foreground, background) {
            return PavpFirstPaintColor.calculateWcag21Contrast(
              PavpFirstPaintColor.parseCssColor(foreground),
              PavpFirstPaintColor.parseCssColor(background))
          })
        if (paletteFailure !== null) return null

        var normalizedPlane = {}

        for (var roleIndex = 0; roleIndex < sourceRoles.length; roleIndex += 1) {
          var roleId = sourceRoles[roleIndex]
          var authoredValue = plane[roleId]
          if (roleId !== 'color.scrim.viewport' &&
              authoredValue !== publicRoleReferences[colorMode][contrast][roleId]) return null
          var resolvedValue = roleId === 'color.scrim.viewport'
            ? authoredValue : resolvePaletteReference(palette, authoredValue)

          if (!isThemeColor(roleId, resolvedValue)) {
            return null
          }

          normalizedPlane[roleId] = resolvedValue

        }

        if (!hasOnlyKeys(normalizedPlane, activePublicColorRoles)) {
          return null
        }

        normalizedPlanes[colorMode][contrast] = normalizedPlane
      }

      var standard = normalizedPlanes[colorMode].standard
      var enhanced = normalizedPlanes[colorMode].enhanced
      var changedStricterEndpoint = false
      for (var pairIndex = 0; pairIndex < namedContrasts.length; pairIndex += 1) {
        var pair = namedContrasts[pairIndex]
        var standardRatio = PavpFirstPaintColor.calculateWcag21Contrast(PavpFirstPaintColor.parseCssColor(standard[pair[0]]), PavpFirstPaintColor.parseCssColor(standard[pair[1]]))
        var enhancedRatio = PavpFirstPaintColor.calculateWcag21Contrast(PavpFirstPaintColor.parseCssColor(enhanced[pair[0]]), PavpFirstPaintColor.parseCssColor(enhanced[pair[1]]))
        if (standardRatio < pair[2] || enhancedRatio < pair[3] ||
          (pair[4] && enhancedRatio <= standardRatio)) return null
        if (pair[3] > pair[2] && (standard[pair[0]] !== enhanced[pair[0]] ||
          standard[pair[1]] !== enhanced[pair[1]])) changedStricterEndpoint = true
      }
      if (!changedStricterEndpoint) return null
    }

    return {
      schemaVersion: value.schemaVersion,
      roleContractVersion: roleContractVersion,
      id: value.id,
      label: value.label,
      planes: normalizedPlanes,
    }
  }

  function matchesPaletteShape(value, shape) {
    if (shape === true) return typeof value === 'string' && /^#[0-9A-F]{6}$/.test(value)
    if (!hasOnlyKeys(value, Object.keys(shape))) return false
    return Object.keys(shape).every(function (key) { return matchesPaletteShape(value[key], shape[key]) })
  }

  function resolvePaletteReference(palette, value) {
    if (typeof value !== 'string') return null
    var match = /^\{palette\.([a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+)\}$/u.exec(value)
    if (match === null) return null
    var current = palette
    for (var segment of match[1].split('.')) {
      if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) return null
      current = current[segment]
    }
    return typeof current === 'string' ? current : null
  }

  function readSelectedCustomThemeDefinition(storageKey, themeId) {
    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return null
    }

    var rawRegistry

    try {
      rawRegistry = localStorage.getItem(storageKey)
    } catch {
      return null
    }

    if (rawRegistry === null) {
      return null
    }

    var registrySnapshot

    try {
      registrySnapshot = JSON.parse(rawRegistry)
      parseJsonSource(rawRegistry, 'Custom Theme Registry')
    } catch {
      return null
    }

    if (
      !hasOnlyKeys(registrySnapshot, ['entries', 'schemaVersion']) ||
      registrySnapshot.schemaVersion !== 1 ||
      !Array.isArray(registrySnapshot.entries)
    ) {
      return null
    }

    var selected = null
    var themeIds = new Set()
    for (var entryIndex = 0; entryIndex < registrySnapshot.entries.length; entryIndex += 1) {
      var entry = registrySnapshot.entries[entryIndex]
      if (!hasOnlyKeys(entry, ['definition', 'registryKind', 'themeId']) ||
        entry.registryKind !== 'custom' || !isRecord(entry.definition) ||
        entry.definition.id !== entry.themeId || themeIds.has(entry.themeId)) return null
      var definition = validatedCustomThemeDefinition(entry.definition)
      if (definition === null) return null
      themeIds.add(entry.themeId)
      if (entry.themeId === themeId) selected = definition
    }
    return selected
  }

  function isDensity(value) {
    return (
      hasOnlyKeys(value, ['preset', 'scale']) &&
      includes(densities, value.preset) &&
      typeof value.scale === 'number' &&
      Number.isFinite(value.scale) &&
      value.scale >= 0.9 &&
      value.scale <= 1.15 &&
      Math.abs(value.scale * 20 - Math.round(value.scale * 20)) < 0.0000001
    )
  }

  function isThemeReference(value) {
    if (!hasOnlyKeys(value, ['registryKind', 'themeId'])) {
      return false
    }

    if (value.registryKind === 'built-in') {
      return includes(builtInThemeIds, value.themeId)
    }

    return value.registryKind === 'custom' && typeof value.themeId === 'string' && value.themeId.length > 0
  }

  function isExplicitAppearance(value) {
    return (
      hasOnlyKeys(value, [
        'colorStyle',
        'colorMode',
        'contrast',
        'density',
        'fontScale',
        'material',
        'motion',
        'theme',
        'radius',
      ]) &&
      includes(['unified', 'dark-navigation', 'brand-sidebar', 'brand-header', 'dark-frame', 'brand-frame', 'soft-frame'], value.colorStyle) &&
      includes(colorModes, value.colorMode) &&
      includes(contrasts, value.contrast) &&
      isDensity(value.density) &&
      includes(fontScales, value.fontScale) &&
      includes(materials, value.material) &&
      includes(motions, value.motion) &&
      isThemeReference(value.theme) &&
      (typeof value.radius === 'number' && Number.isInteger(value.radius) &&
        value.radius >= radiusContract.minimum && value.radius <= radiusContract.maximum)
    )
  }

  function isExplicitThemePreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 4 &&
      isExplicitAppearance(value.appearance)
    )
  }

  function resolveColorMode(storedColorMode, prefersDark) {
    if (storedColorMode === colorModeContract.system) {
      return prefersDark ? colorModeContract.dark : colorModeContract.light
    }

    return storedColorMode
  }

  function resolveMaterial(
    storedMaterial,
    forcedColorsActive,
    reducedTransparencyRequested,
    backdropFilterSupported,
  ) {
    if (forcedColorsActive || storedMaterial === materialContract.solid) {
      return materialContract.solid
    }

    if (storedMaterial === materialContract.reduced) {
      return materialContract.reduced
    }

    if (reducedTransparencyRequested) {
      return materialContract.reduced
    }

    return backdropFilterSupported ? materialContract.adaptive : materialContract.solid
  }

  var currentScript = document.currentScript
  var root = document.documentElement

  if (
    !currentScript ||
    !root ||
    typeof root.setAttribute !== 'function' ||
    typeof root.getAttribute !== 'function' ||
    typeof root.hasAttribute !== 'function' ||
    typeof root.removeAttribute !== 'function' ||
    !root.style ||
    typeof root.style.getPropertyPriority !== 'function' ||
    typeof root.style.getPropertyValue !== 'function' ||
    typeof root.style.setProperty !== 'function' ||
    typeof root.style.removeProperty !== 'function'
  ) {
    return
  }

  var motionMediaQuery
  try {
    if (typeof matchMedia === 'function') motionMediaQuery = matchMedia('(prefers-reduced-motion: reduce)')
  } catch { /* Keep the explicit preference when the platform query is unavailable. */ }

  function readEffectiveMotion(storedMotion) {
    var prefersReducedMotion = false
    try { prefersReducedMotion = Boolean(motionMediaQuery && motionMediaQuery.matches) } catch {}
    return resolveMotion({ storedMotion: storedMotion, prefersReducedMotion: prefersReducedMotion })
  }

  root.setAttribute('data-motion', readEffectiveMotion('full'))

  function clearCustomBankVariables() {
    customBankVariables.forEach(function (variable) {
      root.style.removeProperty(variable)
    })
  }

  function restoreAppearanceSafety() {
    clearCustomBankVariables()
    root.style.removeProperty('--ui-radius-control')
    root.style.removeProperty('--ui-radius-panel')
    root.style.removeProperty('--ui-radius-small')
    root.setAttribute('data-motion', readEffectiveMotion('full'))
    root.setAttribute('data-color-mode', 'light')
    root.setAttribute('data-theme-kind', 'built-in')
    root.setAttribute('data-theme', 'royal-iris')
    root.setAttribute('data-contrast', 'standard')
    root.setAttribute('data-material', 'solid')
    root.setAttribute('data-density', 'comfortable')
  }

  function captureAppearanceState() {
    return {
      attributes: appearanceAttributeNames.map(function (name) {
        return {
          name: name,
          present: root.hasAttribute(name),
          value: root.getAttribute(name),
        }
      }),
      styles: appearanceStylePropertyNames.map(function (name) {
        var value = root.style.getPropertyValue(name)
        var priority = root.style.getPropertyPriority(name)
        return { name: name, present: value !== '' || priority !== '', value: value, priority: priority }
      }),
    }
  }

  function restoreAppearanceState(capture) {
    capture.attributes.forEach(function (attribute) {
      if (attribute.present && attribute.value !== null) {
        root.setAttribute(attribute.name, attribute.value)
      } else {
        root.removeAttribute(attribute.name)
      }
    })

    capture.styles.forEach(function (style) {
      if (style.present) root.style.setProperty(style.name, style.value, style.priority)
      else root.style.removeProperty(style.name)
    })
  }

  function applyRadius(value) {
    var projected = resolveRadius(value, radiusContract)
    root.style.setProperty('--ui-radius-control', String(projected.control) + 'px')
    root.style.setProperty('--ui-radius-panel', String(projected.panel) + 'px')
    root.style.setProperty('--ui-radius-small', String(projected.small) + 'px')
  }

  currentScript.__pavpRestoreAppearanceSafety = restoreAppearanceSafety

  var storageKey =
    typeof currentScript.getAttribute === 'function'
      ? currentScript.getAttribute('data-preference-storage-key')
      : null

  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    return
  }

  var rawPreference

  try {
    rawPreference = localStorage.getItem(storageKey)
  } catch {
    return
  }

  if (rawPreference === null) {
    return
  }

  var parsedPreference

  try {
    parsedPreference = JSON.parse(rawPreference)
  } catch {
    return
  }

  if (!isExplicitThemePreference(parsedPreference)) return

  var storedAppearance = parsedPreference.appearance

  var forcedColorsActive
  var prefersDark
  var reducedTransparencyRequested
  var backdropFilterSupported

  try {
    if (
      typeof matchMedia !== 'function' ||
      typeof CSS !== 'object' ||
      CSS === null ||
      typeof CSS.supports !== 'function'
    ) {
      return
    }

    forcedColorsActive = matchMedia('(forced-colors: active)').matches
    prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
    reducedTransparencyRequested = matchMedia('(prefers-reduced-transparency: reduce)').matches
    backdropFilterSupported =
      CSS.supports('backdrop-filter', 'blur(0)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(0)')
  } catch {
    return
  }

  var effectiveColorMode = resolveColorMode(storedAppearance.colorMode, prefersDark)
  var effectiveMaterial = resolveMaterial(
    storedAppearance.material,
    forcedColorsActive,
    reducedTransparencyRequested,
    backdropFilterSupported,
  )
  var previousAppearanceState = captureAppearanceState()

  try {
    if (storedAppearance.theme.registryKind === 'custom') {
      var customThemeRegistryStorageKey = currentScript.getAttribute(
        'data-theme-registry-storage-key',
      )
      var customDefinition = readSelectedCustomThemeDefinition(
        customThemeRegistryStorageKey,
        storedAppearance.theme.themeId,
      )

      if (customDefinition === null) {
        currentScript.__pavpAppearanceHandoff = { restoration: 'custom-theme-reference' }
        return
      }

      clearCustomBankVariables()

      customBankRecords.forEach(function (record) {
        root.style.setProperty(
          record.bankVariable,
          customDefinition.planes[record.colorMode][record.contrast][record.publicRole],
        )
      })

      root.setAttribute('data-color-mode', effectiveColorMode)
      root.setAttribute('data-theme-kind', 'custom')
      root.setAttribute('data-theme', storedAppearance.theme.themeId)
      root.setAttribute('data-contrast', storedAppearance.contrast)
      root.setAttribute('data-material', effectiveMaterial)
      root.setAttribute('data-density', storedAppearance.density.preset)
      root.setAttribute('data-motion', readEffectiveMotion(storedAppearance.motion))
      root.style.setProperty('--ui-font-scale', String(storedAppearance.fontScale))
      applyRadius(storedAppearance.radius)
      currentScript.__pavpAppearanceHandoff = { restoration: 'custom-theme-reference' }
      return
    }

    clearCustomBankVariables()
    root.setAttribute('data-color-mode', effectiveColorMode)
    root.setAttribute('data-theme-kind', 'built-in')
    root.setAttribute('data-theme', storedAppearance.theme.themeId)
    root.setAttribute('data-contrast', storedAppearance.contrast)
    root.setAttribute('data-material', effectiveMaterial)
    root.setAttribute('data-density', storedAppearance.density.preset)
    root.setAttribute('data-motion', readEffectiveMotion(storedAppearance.motion))
    root.style.setProperty('--ui-font-scale', String(storedAppearance.fontScale))
    applyRadius(storedAppearance.radius)
  } catch {
    restoreAppearanceState(previousAppearanceState)
    clearCustomBankVariables()
  }
})()
