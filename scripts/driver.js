MySample.main = (function() {
  'use strict';

  const canvas = document.getElementById('canvas-main');
  const gl = canvas.getContext('webgl2');

  let shaderProgram;
  let tetrahedronBuffers, cubeBuffers, octahedronBuffers;

  // --- Vertex Data ---
  const octaVertices = new Float32Array([
      -0.5, 0.2, 0.0,
      -0.3, 0.0, 0.0,
      -0.5, 0.0, 0.2,
      -0.7, 0.0, 0.0,
      -0.5, 0.0, -0.2,
      -0.5, -0.2, 0.0
    ]);
  const octaColors = new Float32Array([
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 0.0, 1.0,
      1.0, 0.0, 1.0, 1.0,
      0.0, 1.0, 1.0, 1.0
    ]);
  const octaIndices = new Uint16Array([
      0, 2, 1,
      0, 1, 4,
      0, 4, 3,
      0, 3, 2,
      5, 1, 2,
      5, 4, 1,
      5, 3, 4,
      5, 2, 3
    ]);
  const tetraVertices = new Float32Array([
      0.0, 0.2, -0.1,
      -0.15, -0.1, 0.1,
      0.15, -0.1, 0.1,
      0.0, -0.1, -0.2
    ]);
  const tetraColors = new Float32Array(
    [ 1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 0.0, 1.0
    ]);
  const tetraIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
      0, 3, 1,
      1, 3, 2
    ]);

  const cubeVerticesOriginal = new Float32Array([
      0.3, -0.1, 0.1,
      0.5, -0.1, 0.1,
      0.5, 0.1, 0.1,
      0.3, 0.1, 0.1,
      0.3, -0.1, -0.1,
      0.5, -0.1, -0.1,
      0.5, 0.1, -0.1,
      0.3, 0.1, -0.1
    ]);

  const cubeVertices = new Float32Array(cubeVerticesOriginal); // Create a copy to modify
  cubeVertices[0] = 0.8; cubeVertices[3] = 1.0; cubeVertices[6] = 1.0; cubeVertices[9] = 0.8;
  cubeVertices[12]= 0.8; cubeVertices[15]= 1.0; cubeVertices[18]= 1.0; cubeVertices[21]= 0.8;
  const cubeColors = new Float32Array([
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 0.0, 1.0,
      1.0, 0.0, 1.0, 1.0,
      0.0, 1.0, 1.0, 1.0,
      0.5, 0.5, 0.5, 1.0,
      1.0, 0.5, 0.0, 1.0
    ]);
  const cubeIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
    4, 7, 6,
    4, 6, 5,
    4, 0, 3,
    4, 3, 7,
    1, 5, 6,
    1, 6, 2,
    3, 2, 6,
    3, 6, 7,
    4, 5, 1,
    4, 1, 0
  ]);

  function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`, gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
      }
      return shader;
  }

  function createShaderProgram(gl, vertexSource, fragmentSource) {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertexShader || !fragmentShader) return null;
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error('Error linking program:', gl.getProgramInfoLog(program));
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          return null;
      }
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return program;
  }

  let rotation = 0;
  let lastProjectionSwitch = 0;
  let isPerspective = true;
  const PROJECTION_SWITCH_INTERVAL = 4000;

  let scaleFactor = 1.0;
  let scaleDirection = 1;
  let renderHasLogged = false;

  function update() {
      rotation += 0.02;
      const scaleSpeed = 0.005;
      scaleFactor += scaleDirection * scaleSpeed;
      if (scaleFactor > 1.2 || scaleFactor < 0.8) {
          scaleDirection *= -1;
      }
      const currentTime = Date.now();
      if (currentTime - lastProjectionSwitch > PROJECTION_SWITCH_INTERVAL) {
          isPerspective = !isPerspective;
          lastProjectionSwitch = currentTime;
          console.log('Switched to', isPerspective ? 'PERSPECTIVE' : 'PARALLEL', 'projection');
      }
  }

  function render() {
      if (isPerspective) {
          gl.clearColor(0.2, 0.2, 0.3, 1.0);
      } else {
          gl.clearColor(0.3, 0.1, 0.1, 1.0);
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.frontFace(gl.CCW);

      gl.useProgram(shaderProgram);

      const projLocation = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
      const viewLocation = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
      const modelLocation = gl.getUniformLocation(shaderProgram, 'uModelMatrix');

      const viewMatrix = createTranslationMatrix(0, 0, -3.0);
      gl.uniformMatrix4fv(viewLocation, false, transposeMatrix4x4(viewMatrix));

      // --- Projection Matrix ---
      let projectionMatrix;
      const aspect = canvas.width / canvas.height;

      const nearClipZ = -0.1;
      const farClipZ = -10.0;

      if (isPerspective) {
          projectionMatrix = createPerspectiveMatrix(Math.PI / 4, aspect, nearClipZ, farClipZ);
      } else {
          const orthoHeight = 1.5;
          const orthoWidth = orthoHeight * aspect;
          projectionMatrix = createOrthographicMatrix(
              -orthoWidth, orthoWidth,
              -orthoHeight, orthoHeight,
              nearClipZ, farClipZ
          );
      }
      gl.uniformMatrix4fv(projLocation, false, transposeMatrix4x4(projectionMatrix));

      const posLocation = gl.getAttribLocation(shaderProgram, 'aPosition');
      const colorLocation = gl.getAttribLocation(shaderProgram, 'aColor');

      // --- Render Octahedron ---
      let octaModel_Rotate = multiplyMatrix4x4(createRotationMatrixY(rotation * 0.4), createRotationMatrixX(rotation * 0.25));
      let octaModel = multiplyMatrix4x4(createScaleMatrix(scaleFactor, scaleFactor, scaleFactor), octaModel_Rotate);
      gl.uniformMatrix4fv(modelLocation, false, transposeMatrix4x4(octaModel));
      gl.bindBuffer(gl.ARRAY_BUFFER, octahedronBuffers.vertex);
      gl.enableVertexAttribArray(posLocation);
      gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, octahedronBuffers.color);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, octahedronBuffers.index);
      gl.drawElements(gl.TRIANGLES, octaIndices.length, gl.UNSIGNED_SHORT, 0);

      // --- Render Tetrahedron ---
      let tetraTranslateY = Math.sin(rotation * 1.3) * 0.25;
      let tetraModel_RotateScale = multiplyMatrix4x4(
          createScaleMatrix(scaleFactor * 0.9, scaleFactor * 0.9, scaleFactor * 0.9),
          multiplyMatrix4x4(createRotationMatrixY(rotation * 0.5), createRotationMatrixX(rotation * 0.3))
      );
      let tetraModel = multiplyMatrix4x4(createTranslationMatrix(0, tetraTranslateY, 0), tetraModel_RotateScale);
      gl.uniformMatrix4fv(modelLocation, false, transposeMatrix4x4(tetraModel));
      gl.bindBuffer(gl.ARRAY_BUFFER, tetrahedronBuffers.vertex);
      gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, tetrahedronBuffers.color);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tetrahedronBuffers.index);
      gl.drawElements(gl.TRIANGLES, tetraIndices.length, gl.UNSIGNED_SHORT, 0);

      // --- Render Cube ---
      let cubeModel_Rotate = multiplyMatrix4x4(createRotationMatrixY(rotation * 0.1), createRotationMatrixX(rotation * 0.75));
      let cubeModel = multiplyMatrix4x4(createScaleMatrix(scaleFactor * 1.1, scaleFactor * 1.1, scaleFactor * 1.1), cubeModel_Rotate);
      gl.uniformMatrix4fv(modelLocation, false, transposeMatrix4x4(cubeModel));
      gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffers.vertex);
      gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffers.color);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeBuffers.index);
      gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);

      if (!renderHasLogged) {
          console.log('Rendering with clipping planes Z_view=[-1, -10] applied to preferred driver version.');
          renderHasLogged = true;
      }
  }

  function animationLoop() {
      update();
      render();
      requestAnimationFrame(animationLoop);
  }

  async function initialize() {
      console.log('Initializing WebGL (Preferred Version Base)...');
      if (!gl) {
          console.error('WebGL 2 not supported.');
          document.body.innerHTML = "WebGL 2 is not available.";
          return;
      }
      try {
          const vertexShaderSource = await loadFileFromServer('shaders/simple.vert');
          const fragmentShaderSource = await loadFileFromServer('shaders/simple.frag');
          shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
          if (!shaderProgram) return;

          octahedronBuffers = { vertex: gl.createBuffer(), color: gl.createBuffer(), index: gl.createBuffer() };
          gl.bindBuffer(gl.ARRAY_BUFFER, octahedronBuffers.vertex); gl.bufferData(gl.ARRAY_BUFFER, octaVertices, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, octahedronBuffers.color); gl.bufferData(gl.ARRAY_BUFFER, octaColors, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, octahedronBuffers.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, octaIndices, gl.STATIC_DRAW);

          tetrahedronBuffers = { vertex: gl.createBuffer(), color: gl.createBuffer(), index: gl.createBuffer() };
          gl.bindBuffer(gl.ARRAY_BUFFER, tetrahedronBuffers.vertex); gl.bufferData(gl.ARRAY_BUFFER, tetraVertices, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, tetrahedronBuffers.color); gl.bufferData(gl.ARRAY_BUFFER, tetraColors, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tetrahedronBuffers.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tetraIndices, gl.STATIC_DRAW);

          cubeBuffers = { vertex: gl.createBuffer(), color: gl.createBuffer(), index: gl.createBuffer() };
          gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffers.vertex); gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffers.color); gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeBuffers.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

          lastProjectionSwitch = Date.now();
          requestAnimationFrame(animationLoop);
      } catch (error) {
          console.error('Error during WebGL initialization:', error);
      }
  }
  initialize();
}());