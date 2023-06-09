
var vertex_shader = `
  attribute vec4 a_position;
  attribute vec2 a_texcoord;
  uniform mat4 u_matrix;
  varying vec2 v_texcoord;
  void main() {
     gl_Position = u_matrix * a_position;
     v_texcoord = a_texcoord;
  }
`;

var fragment_shader = `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;

  void main() {
     gl_FragColor = texture2D(u_texture, v_texcoord);
  }
`;

//
// creates a shader of the given type, uploads the source andtexImage2D
// compiles it.
//
function loadShader(gl: WebGL2RenderingContext, type, source) {
  const shader = gl.createShader(type)!;

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(
      'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initShaderProgram(gl: WebGL2RenderingContext) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertex_shader)!;
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment_shader)!;

  // Create the shader program

  const shaderProgram = gl.createProgram()!;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      'Unable to initialize the shader program: ' +
        gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }

  return shaderProgram;
}

function initTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Turn off mips and set  wrapping to clamp to edge so it
  // will work regardless of the dimensions of the video.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  return texture;
}

function startDemo() {
  document.querySelector('button').disabled = true;
  var log = document.querySelector('textarea');
  if (
    typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined'
  ) {
    log.value =
      'Your browser does not support the experimental MediaStreamTrack API. ' +
      'Please launch with the --enable-blink-features=WebCodecs,MediaStreamInsertableStreams flag';
    return;
  }

  var stopped = false;

  var canvas = document.querySelector('canvas')!;
  var gl = canvas.getContext('webgl2')!;
  var program = initShaderProgram(gl)!;

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, 'a_position');
  var texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  var textureLocation = gl.getUniformLocation(program, 'u_texture');

  // Create a buffer.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Put a unit quad in the buffer
  var positions = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a buffer for texture coords
  texcoordBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Put texcoords in the buffer
  var texcoords = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
  texture = initTexture(gl)!;

  function drawImage(gl, tex, texWidth, texHeight, dstX, dstY) {
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // this matirx will convert from pixels to clip space
    var matrix = m4.orthographic(
      0,
      gl.canvas.width,
      gl.canvas.height,
      0,
      -1,
      1
    );

    // this matrix will translate our quad to dstX, dstY
    matrix = m4.translate(matrix, dstX, dstY, 0);

    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
    matrix = m4.scale(matrix, texWidth, texHeight, 1);

    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(textureLocation, 0);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function updateTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, frame: VideoFrame) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      frame
    );
    if (gl.getError() != gl.NO_ERROR) console.log(gl.getError());
    else drawImage(gl, texture, 640, 360, 0, 0);
  }

  var stopped = false;
  var constraints = { audio: false, video: { width: 1280, height: 720 } };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (mediaStream) {
      var track = mediaStream.getTracks()[0];
      track.onended = (_) => {
        console.log('ended');
      };
      track.onmute = (_) => {
        console.log('muted');
      };
      track.onunmute = (_) => {
        console.log('unmuted');
      };
      var processor = new MediaStreamTrackProcessor(track);
      const frameReader = processor.readable.getReader();
      var frameCount = 0;
      frameReader.read().then(function processFrame({ done, value }) {
        if (done) {
          log.value += 'Stream is done;';
          return;
        }

        if (stopped) {
          frameReader.releaseLock();
          processor.readable.cancel();
          value.close();
          log.value += 'Stopped;';
          return;
        }
        updateTexture(gl, texture, value);
        value.close();
        frameReader.read().then(processFrame);
      });
    })
    .catch(function (err) {
      log.value += err.name + ': ' + err.message;
    });
}
