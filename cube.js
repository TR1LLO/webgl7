
"use strict";

//________________________________________________________________________
//---------------TEXTURES-------------------------------------------------
var im1, im2, im3;
const _tx = new Uint8Array([0, 0, 255, 255]);

function loadtexture(src)
{
	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, 
		gl.RGBA, gl.UNSIGNED_BYTE, _tx);

	const im = new Image();
	im.crossOrigin="anonymous";
	im.onload = function potat(){
		gl.bindTexture(gl.TEXTURE_2D, tx);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	};
	im.src=src;
	return tx;
}
function textureinit()
{
	im1 = loadtexture("texture.jpg");
	im2 = loadtexture("ds.jpg");
	im3 = loadtexture("t1.jpg");
}

//________________________________________________________________________
//---------------PROGRAMS-------------------------------------------------

function initProgram(vssrc, fssrc, name)
{
	const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vssrc);
    gl.compileShader(vs);
	
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fssrc);
    gl.compileShader(fs);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
	
    return {
		name: name,
        prog: prog,
		vposloc: gl.getAttribLocation(prog, '_pos'),
		vnorloc: gl.getAttribLocation(prog, '_nor'),
		vtxyloc: gl.getAttribLocation(prog, '_txy'),
		
		m4ptloc: gl.getUniformLocation(prog, 'm4pt'),
		m3ntloc: gl.getUniformLocation(prog, 'm3nt'),
		projloc: gl.getUniformLocation(prog, 'proj'),

		colrloc: gl.getUniformLocation(prog, 'colr'),
		lsrcloc: gl.getUniformLocation(prog, 'lsrc'),
		
		ambiloc: gl.getUniformLocation(prog, 'ambi'),
		diffloc: gl.getUniformLocation(prog, 'diff'),
		specloc: gl.getUniformLocation(prog, 'spec'),

		_tx1loc: gl.getUniformLocation(prog, '_tx1'),
		_ntxloc: gl.getUniformLocation(prog, '_ntx'),
    };
}

var info_1p;
var vssrc_1p = 
`#version 300 es
	in vec4 _pos;
	in vec3 _nor;
	in vec2 _txy;

	uniform mat4 m4pt;
	uniform mat3 m3nt;
	uniform mat4 proj;

	out vec4 pos;
	out vec3 nor;
	out vec2 txy;

	void main() {
		vec4 p = m4pt * _pos;
		gl_Position = proj * p;

		pos = p/p.w;
		nor = m3nt * _nor;
		txy = vec2(1.0f-_txy.x, _txy.y);
	}
`;
var fssrc_1p = 
`#version 300 es
	precision mediump float;

	uniform vec4 lsrc;
	uniform float ambi;
	uniform float diff;
	uniform float spec;

	uniform vec4 colr;
	uniform sampler2D _tx1;
	uniform sampler2D _ntx;

	in vec4 pos;
	in vec3 nor;
	in vec2 txy;
	out vec4 _col;

	float phong(vec4 lsrc, vec3 nor)
	{
		vec3 dpos = lsrc.xyz-pos.xyz;
		vec3 ldir = normalize(dpos);
		vec3 vdir = -normalize(pos.xyz);
		vec3 rdir = reflect(nor, ldir);
		
		float _diff = max(0.0, dot(nor, ldir)) * diff;
		float _spec = pow(max(0.0, dot(rdir, vdir)), spec);
		return (_diff+_spec) * lsrc.w/length(dpos);
	}


	const float dx=1.0f/1024.0f, dy=dx;
	void main() {
		vec3 grad=vec3(0.0f, 0.0f, 0.0f);
		
		float x0=texture(_ntx, vec2(txy.x-dx, txy.y)).x;
		float x1=texture(_ntx, vec2(txy.x+dx, txy.y)).x;
		grad.x=x1-x0;
		
		float y0=texture(_ntx, vec2(txy.x, txy.y-dy)).y;
		float y1=texture(_ntx, vec2(txy.x, txy.y+dy)).y;
		grad.y=y1-y0;

		vec3 n=(nor+grad)*0.5f;
		float _l=ambi+phong(lsrc, n);


		float a=colr[3];
		vec4 t = texture(_tx1, txy)*(1.0f-a)+colr*a; 
		_col = vec4(t.r*_l, t.g*_l, t.b*_l, 1.0f);
	}
`;

var info_2p;
var vssrc_2p = 
`#version 300 es
	in vec4 _pos;

	uniform mat4 proj;

	void main() {
		vec4 p = proj * _pos;
		gl_Position = p;
		gl_PointSize=8.0f;
	}
`;
var fssrc_2p = 
`#version 300 es
	precision mediump float;

	uniform vec4 colr;

	out vec4 _col;

	void main() {
		_col = vec4(1, 0, 0, 1);
	}
`;

//_____________________________________________________________________
//---------------MAIN--------------------------------------------------

var gl;
var h1;
var canv;
window.onload = function main() 
{
	h1 = document.querySelector("#oof");
    canv = document.querySelector("#canvas1");
	gl = canv.getContext("webgl2");

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
	

    info_1p = initProgram(vssrc_1p, fssrc_1p, "OOOOOOOOOOOOOOOOF");
    info_2p = initProgram(vssrc_2p, fssrc_2p, "dots");
	h1.textContent="хорошо что это сундуки вот эти наверху остались";

	
	textureinit();
	spaceinit();

	update();
}

//_________________________________________________________________________
//---------------CONTROLS--------------------------------------------------
var lsrc = [2, 2, 0, 1];
var ambi = 0.1;
var diff = 1.0;
var spec = 12.0;

window.onkeydown=(e)=>{
	if(e.code=="KeyQ") figures[0].selfapply(roty0);
	if(e.code=="KeyE") figures[0].selfapply(roty1);

	if(e.code=="Numpad4") 			lsrc[0]-=0.1;
	if(e.code=="Numpad6") 			lsrc[0]+=0.1;
	if(e.code=="Numpad2") 			lsrc[1]-=0.1;
	if(e.code=="Numpad8") 			lsrc[1]+=0.1;
	if(e.code=="NumpadAdd") 		lsrc[2]-=0.1;
	if(e.code=="NumpadSubtract") 	lsrc[2]+=0.1;

	if(e.code=="Digit1") ambi*=1.1;
	if(e.code=="Digit2") ambi/=1.1;
	if(e.code=="Digit3") diff*=1.1;
	if(e.code=="Digit4") diff/=1.1;
	if(e.code=="Digit5") spec*=1.1;
	if(e.code=="Digit6") spec/=1.1;
	
}

window.onmousedown=(e)=>{
	lsrc[0]=-1+e.pageX/canv.width*2;
	lsrc[1]=+1-e.pageY/canv.height*2;
}
window.onwheel=(e)=>{
	lsrc[2] += e.deltaY<0? +0.2: -0.2;
}

//_____________________________________________________________________
//-------AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-------------

// я запрещаю смотреть это
function parseOBJ(text) {
	// because indices are base 1 let's just fill in the 0th data
	const objPositions = [[0, 0, 0]];
	const objTexcoords = [[0, 0]];
	const objNormals = [[0, 0, 0]];
  
	// same order as `f` indices
	const objVertexData = [
	  objPositions,
	  objTexcoords,
	  objNormals,
	];
  
	// same order as `f` indices
	let webglVertexData = [
	  [],   // positions
	  [],   // texcoords
	  [],   // normals
	];
  
	function newGeometry() {
	  // If there is an existing geometry and it's
	  // not empty then start a new one.
	  if (geometry && geometry.data.position.length) {
		geometry = undefined;
	  }
	  setGeometry();
	}
  
	function addVertex(vert) {
	  const ptn = vert.split('/');
	  ptn.forEach((objIndexStr, i) => {
		if (!objIndexStr) {
		  return;
		}
		const objIndex = parseInt(objIndexStr);
		const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
		webglVertexData[i].push(...objVertexData[i][index]);
	  });
	}
  
	const keywords = {
	  v(parts) {
		objPositions.push(parts.map(parseFloat));
	  },
	  vn(parts) {
		objNormals.push(parts.map(parseFloat));
	  },
	  vt(parts) {
		// should check for missing v and extra w?
		objTexcoords.push(parts.map(parseFloat));
	  },
	  f(parts) {
		const numTriangles = parts.length - 2;
		for (let tri = 0; tri < numTriangles; ++tri) {
		  addVertex(parts[0]);
		  addVertex(parts[tri + 1]);
		  addVertex(parts[tri + 2]);
		}
	  },
	};
  
	const keywordRE = /(\w*)(?: )*(.*)/;
	const lines = text.split('\n');
	for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
	  const line = lines[lineNo].trim();
	  if (line === '' || line.startsWith('#')) {
		continue;
	  }
	  const m = keywordRE.exec(line);
	  if (!m) {
		continue;
	  }
	  const [, keyword, unparsedArgs] = m;
	  const parts = line.split(/\s+/).slice(1);
	  const handler = keywords[keyword];
	  if (!handler) {
		console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
		continue;
	  }
	  handler(parts, unparsedArgs);
	}
  
	return {
	  pos: webglVertexData[0],
	  txy: webglVertexData[1],
	  nor: webglVertexData[2],
	};
}
function bufferize(parsedobj)
{
	const size = parsedobj.pos.length;

	const posbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(parsedobj.pos), gl.STATIC_DRAW);
	const txybuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, txybuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(parsedobj.txy), gl.STATIC_DRAW);
	const norbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, norbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(parsedobj.nor), gl.STATIC_DRAW);

	return {
		size,
		pos: parsedobj.pos,
		posbuf,
		txybuf,
		norbuf,
	}
}

//_____________________________________________________________________
//---------------SPACE-------------------------------------------------


class figure
{
	constructor(size, posbuf, txybuf, norbuf, tx, ntx)
	{
		this.size=size;
		this.posbuf=posbuf;
		this.txybuf=txybuf;
		this.norbuf=norbuf;
		this.tx=tx;
		this.ntx=ntx;

		this.m4pt=mat4.create();
		this.m3nt=mat3.create();
		this.m4tm=mat4.create();

		this.col=[0, 0, 0, 0];
	}

	//--------main----------
	render()
	{
		const info = info_1p;
		//----------------attributes--------------
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posbuf);
		gl.vertexAttribPointer(info.vposloc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(info.vposloc);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.norbuf);
		gl.vertexAttribPointer(info.vnorloc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(info.vnorloc);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.txybuf);
		gl.vertexAttribPointer(info.vtxyloc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(info.vtxyloc);
	
	
		//----------------uniforms--------------
		gl.useProgram(info.prog);
		gl.uniformMatrix4fv(info.m4ptloc, false, this.m4pt);
		gl.uniformMatrix3fv(info.m3ntloc, false, this.m3nt);
		gl.uniformMatrix4fv(info.projloc, false, proj);
		
		gl.uniform4fv(info.colrloc, this.col);

		gl.uniform4fv(info.lsrcloc, lsrc);
		gl.uniform1f(info.ambiloc, ambi);
		gl.uniform1f(info.diffloc, diff);
		gl.uniform1f(info.specloc, spec);

	
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.tx);
		gl.uniform1i(info._tx1loc, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.ntx);
		gl.uniform1i(info._ntxloc, 1);

	
		gl.drawArrays(gl.TRIANGLES, 0, this.size);
	}
	update()
	{
	}

	//--------transform----------

	back()
	{
		mat4.copy(this.m4pt, this.m4tm);
	}

	apply(mat)
	{
		mat4.copy(this.m4tm, this.m4pt);
		mat4.multiply(this.m4pt, this.m4pt, mat);
		mat3.normalFromMat4(this.m3nt, this.m4pt);
	}
	selfapply(mat)
	{
		mat4.copy(this.m4tm, this.m4pt);
		const m=this.m4pt;
		const x=m[12], y=m[13], z=m[14];
		m[12]-=x; m[13]-=y; m[14]-=z;
		mat4.multiply(this.m4pt, this.m4pt, mat);
		m[12]+=x; m[13]+=y; m[14]+=z;
		mat3.normalFromMat4(this.m3nt, this.m4pt);
	}

	scale(val)
	{
		mat4.copy(this.m4tm, this.m4pt);
		this.m4pt[15]*=val;
		mat3.normalFromMat4(this.m3nt, this.m4pt);
	}
	move(dx, dy, dz)
	{
		mat4.copy(this.m4tm, this.m4pt);
		this.m4pt[12]+=dx;
		this.m4pt[13]+=dy;
		this.m4pt[14]+=dz;
	}
	moveto(x, y, z)
	{
		mat4.copy(this.m4tm, this.m4pt);
		this.m4pt[12]=x;
		this.m4pt[13]=y;
		this.m4pt[14]=z;
	}
}


const figures = [];
function update()
{
	figures.forEach((f)=>{f.update()})
	drawScene();
	requestAnimationFrame(update);
}

const proj = mat4.create();
const roty0 = mat4.create(), roty1 = mat4.create();
function basisinit()
{
	const scale=1024;
	proj[0]=scale/canv.width;
	proj[5]=scale/canv.height;
	mat4.rotateX(proj, proj, -0.4);

	const rot = 0.2;
	mat4.rotateY(roty0, roty0, -rot);

	mat4.rotateY(roty1, roty1, +rot);
}


async function loadfigure(src, tx, ntx)
{
	const r1 = await fetch(src);  
	const t1 = await r1.text();
	const a1 = parseOBJ(t1);
	const d1 = bufferize(a1);
	const f = new figure(d1.size, d1.posbuf, d1.txybuf, d1.norbuf, tx, ntx);
	return f;
}
async function spaceinit()
{
	basisinit();
	const src1 = "t90.obj";
	const src2 = "s.obj";
	
	const f1 = await loadfigure(src2, im1, im2);
	figures.push(f1);
	f1.move(0, 0, 0); f1.scale(2);

	f1.col=[1, 0.67, 0, 1];
}

//_______________________________________________________________________
//---------------RENDER--------------------------------------------------
function drawPoints(pts, col)
{
	const info = info_2p;
	const dep=pts[0].length;
	const len=pts.length;
	const arr=pts.flat(2);

	//----------------attributes--------------
	const buf=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

    gl.vertexAttribPointer(info.vposloc, dep, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(info.vposloc);
	

	//----------------uniforms--------------
	gl.useProgram(info.prog);
		
	gl.uniform4fv(info.colrloc, col);
	gl.uniformMatrix4fv(info.projloc, false, proj);
		
	gl.drawArrays(gl.POINTS, 0, len);
}


function drawScene() 
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	figures.forEach((f)=>{f.render()});

	drawPoints([lsrc], [1, 0, 0, 1]);
}