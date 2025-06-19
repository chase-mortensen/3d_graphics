MySample.main = (function() {
  'use strict';

  const canvas = document.getElementById('canvas-main');
  const gl = canvas.getContext('webgl2');

  let shaderProgram;
  let skyboxProgram;
  let texturedProgram;
  let reflectionProgram;
  let mixedProgram;
  let bunnyModel = null;
  let dragonModel = null;
  let skyboxModel = null;
  let skyboxTexture = null;
  let bunnyTexture = null;
  let currentModel = 'bunny';
  let renderingMode = 'normal'; // 'normal', 'textured', 'reflection', 'mixed'

  let lights = [
    { position: [2.0, 2.0, 2.0], color: [1.0, 0.0, 0.0], enabled: true },
    { position: [-2.0, 2.0, 0.0], color: [0.0, 1.0, 0.0], enabled: true },
    { position: [0.0, -2.0, 2.0], color: [0.0, 0.0, 1.0], enabled: true }
  ];

  let ambientColor = [0.1, 0.1, 0.1];
  let rotation = 0;
  let frameCount = 0;
  let cameraPosition = [0, 0, 0];
  let specularExponent = 32.0;

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

  function calculateNormals(vertices, indices) {
    if (!vertices || vertices.length === 0) {
      console.error('calculateNormals: vertices array is empty or undefined');
      return new Float32Array(0);
    }
    if (!indices || indices.length === 0) {
      console.error('calculateNormals: indices array is empty or undefined');
      return new Float32Array(vertices.length);
    }

    const normals = new Float32Array(vertices.length);
    const vertexNormals = new Array(vertices.length / 3).fill(0).map(() => [0, 0, 0]);

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      if (i0 >= vertices.length / 3 || i1 >= vertices.length / 3 || i2 >= vertices.length / 3 ||
          i0 < 0 || i1 < 0 || i2 < 0) {
        console.error(`Invalid indices at triangle ${i/3}: ${i0}, ${i1}, ${i2}. Vertex count: ${vertices.length / 3}`);
        continue;
      }

      const v0 = [vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]];
      const v1 = [vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]];
      const v2 = [vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]];

      const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];

      vertexNormals[i0][0] += normal[0];
      vertexNormals[i0][1] += normal[1];
      vertexNormals[i0][2] += normal[2];
      vertexNormals[i1][0] += normal[0];
      vertexNormals[i1][1] += normal[1];
      vertexNormals[i1][2] += normal[2];
      vertexNormals[i2][0] += normal[0];
      vertexNormals[i2][1] += normal[1];
      vertexNormals[i2][2] += normal[2];
    }

    for (let i = 0; i < vertexNormals.length; i++) {
      const length = Math.sqrt(
        vertexNormals[i][0] * vertexNormals[i][0] +
        vertexNormals[i][1] * vertexNormals[i][1] +
        vertexNormals[i][2] * vertexNormals[i][2]
      );
      if (length > 0) {
        normals[i * 3] = vertexNormals[i][0] / length;
        normals[i * 3 + 1] = vertexNormals[i][1] / length;
        normals[i * 3 + 2] = vertexNormals[i][2] / length;
      }
    }

    return normals;
  }

  function createModelBuffers(gl, plyData) {
    const normals = plyData.normals.every(n => n === 0) ?
      calculateNormals(plyData.vertices, plyData.indices) :
      plyData.normals;

    // Generate simple spherical texture coordinates
    const texCoords = generateTextureCoordinates(plyData.vertices, plyData.bounds);

    const buffers = {
      vertex: gl.createBuffer(),
      normal: gl.createBuffer(),
      texCoord: gl.createBuffer(),
      index: gl.createBuffer(),
      indexCount: plyData.indices.length,
      indexType: plyData.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      bounds: plyData.bounds
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, plyData.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plyData.indices, gl.STATIC_DRAW);

    return buffers;
  }

  function generateTextureCoordinates(vertices, bounds) {
    const texCoords = new Float32Array((vertices.length / 3) * 2);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    
    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    const sizeZ = bounds.maxZ - bounds.minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = (vertices[i] - centerX) / maxSize;
      const y = (vertices[i + 1] - centerY) / maxSize;
      const z = (vertices[i + 2] - centerZ) / maxSize;
      
      // Simple spherical projection
      const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
      const v = 0.5 - Math.asin(y) / Math.PI;
      
      const texIndex = (i / 3) * 2;
      texCoords[texIndex] = u;
      texCoords[texIndex + 1] = v;
    }
    
    return texCoords;
  }

  function createNormalMatrix(modelMatrix) {
    const normalMatrix = new Float32Array(16);

    const m = modelMatrix;
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const det = a00 * (a11 * a22 - a12 * a21) -
                a01 * (a10 * a22 - a12 * a20) +
                a02 * (a10 * a21 - a11 * a20);

    if (Math.abs(det) < 1e-10) {
      return createIdentityMatrix();
    }

    const invDet = 1.0 / det;

    normalMatrix[0] = (a11 * a22 - a12 * a21) * invDet;
    normalMatrix[1] = (a02 * a21 - a01 * a22) * invDet;
    normalMatrix[2] = (a01 * a12 - a02 * a11) * invDet;
    normalMatrix[3] = 0;

    normalMatrix[4] = (a12 * a20 - a10 * a22) * invDet;
    normalMatrix[5] = (a00 * a22 - a02 * a20) * invDet;
    normalMatrix[6] = (a02 * a10 - a00 * a12) * invDet;
    normalMatrix[7] = 0;

    normalMatrix[8] = (a10 * a21 - a11 * a20) * invDet;
    normalMatrix[9] = (a01 * a20 - a00 * a21) * invDet;
    normalMatrix[10] = (a00 * a11 - a01 * a10) * invDet;
    normalMatrix[11] = 0;

    normalMatrix[12] = 0;
    normalMatrix[13] = 0;
    normalMatrix[14] = 0;
    normalMatrix[15] = 1;

    return normalMatrix;
  }

  function createSkyboxGeometry(gl) {
    // Create a cube for the skybox
    const vertices = new Float32Array([
      // positions          
      -1.0,  1.0, -1.0,
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
      -1.0,  1.0, -1.0,

      -1.0, -1.0,  1.0,
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
      -1.0, -1.0,  1.0,

       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,

      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    return {
      vertex: buffer,
      vertexCount: 36
    };
  }

  async function loadCubeMap(gl, faces) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceTargets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];

    const promises = faces.map((face, index) => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
          gl.texImage2D(faceTargets[index], 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
          resolve();
        };
        image.onerror = reject;
        image.src = face;
      });
    });

    await Promise.all(promises);

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    return texture;
  }

  async function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Put a single pixel in the texture so we can use it immediately
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        resolve(texture);
      };
      image.onerror = reject;
      image.src = url;
    });
  }

  function renderSkybox() {
    if (!skyboxProgram || !skyboxModel || !skyboxTexture) return;

    gl.useProgram(skyboxProgram);
    gl.depthFunc(gl.LEQUAL);

    const projectionMatrix = createPerspectiveMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
    const viewMatrix = multiplyMatrix4x4(
      createTranslationMatrix(0, -1.0, -5.0),
      createRotationMatrixX(-0.3)
    );

    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uProjectionMatrix'), false, transposeMatrix4x4(projectionMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uViewMatrix'), false, transposeMatrix4x4(viewMatrix));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(skyboxProgram, 'uSkybox'), 0);

    const posLocation = gl.getAttribLocation(skyboxProgram, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxModel.vertex);
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, skyboxModel.vertexCount);
    gl.depthFunc(gl.LESS);
  }

  function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CW);
    gl.cullFace(gl.BACK);

    // Render skybox first
    renderSkybox();

    if ((!shaderProgram && !texturedProgram) || (!bunnyModel && !dragonModel)) {
      return;
    }

    // Select appropriate shader program based on rendering mode
    let program = shaderProgram;
    if (currentModel === 'bunny') {
      switch (renderingMode) {
        case 'textured':
          program = texturedProgram || shaderProgram;
          break;
        case 'reflection':
          program = reflectionProgram || shaderProgram;
          break;
        case 'mixed':
          program = mixedProgram || shaderProgram;
          break;
        default:
          program = shaderProgram;
      }
    }
    gl.useProgram(program);

    const projectionMatrix = createPerspectiveMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
    const viewMatrix = multiplyMatrix4x4(
      createTranslationMatrix(0, -1.0, -5.0),
      createRotationMatrixX(-0.3)
    );
    
    // Calculate camera position (inverse of view matrix translation)
    cameraPosition = [0, 1.0, 5.0];

    const model = currentModel === 'bunny' ? bunnyModel : dragonModel;
    let modelMatrix = createIdentityMatrix();

    if (model && model.bounds) {
      const centerX = (model.bounds.minX + model.bounds.maxX) / 2;
      const centerY = (model.bounds.minY + model.bounds.maxY) / 2;
      const centerZ = (model.bounds.minZ + model.bounds.maxZ) / 2;

      const sizeX = model.bounds.maxX - model.bounds.minX;
      const sizeY = model.bounds.maxY - model.bounds.minY;
      const sizeZ = model.bounds.maxZ - model.bounds.minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      const scale = 1.5 / maxSize;

      const translationMatrix = createTranslationMatrix(-centerX, -centerY, -centerZ);
      const scaleMatrix = createScaleMatrix(scale, scale, scale);
      const rotationMatrix = multiplyMatrix4x4(
        createRotationMatrixY(rotation),
        createRotationMatrixX(rotation * 0.5)
      );

      const centerTransform = multiplyMatrix4x4(scaleMatrix, translationMatrix);
      const rotatedTransform = multiplyMatrix4x4(rotationMatrix, centerTransform);
      const finalTranslation = createTranslationMatrix(0, 0, -2.0);
      modelMatrix = multiplyMatrix4x4(finalTranslation, rotatedTransform);
    }

    const normalMatrix = createNormalMatrix(modelMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, transposeMatrix4x4(projectionMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, transposeMatrix4x4(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, transposeMatrix4x4(modelMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, transposeMatrix4x4(normalMatrix));

    const lightPositions = lights.map(light => light.position).flat();
    const lightColors = lights.map(light => light.color).flat();
    const lightEnabled = lights.map(light => light.enabled);

    // Set common uniforms if they exist in the shader
    const lightPosLoc = gl.getUniformLocation(program, 'uLightPositions');
    const lightColLoc = gl.getUniformLocation(program, 'uLightColors');
    const lightEnabledLoc = gl.getUniformLocation(program, 'uLightEnabled');
    const ambientLoc = gl.getUniformLocation(program, 'uAmbientColor');
    const cameraLoc = gl.getUniformLocation(program, 'uCameraPosition');
    const specularLoc = gl.getUniformLocation(program, 'uSpecularExponent');

    if (lightPosLoc) gl.uniform3fv(lightPosLoc, lightPositions);
    if (lightColLoc) gl.uniform3fv(lightColLoc, lightColors);
    if (lightEnabledLoc) gl.uniform1iv(lightEnabledLoc, lightEnabled);
    if (ambientLoc) gl.uniform3fv(ambientLoc, ambientColor);
    if (cameraLoc) gl.uniform3fv(cameraLoc, cameraPosition);
    if (specularLoc) gl.uniform1f(specularLoc, specularExponent);

    // Set texture for textured rendering
    if (program === texturedProgram && bunnyTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bunnyTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 1);
    }

    // Set environment map for reflection and mixed rendering
    if ((program === reflectionProgram || program === mixedProgram) && skyboxTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'uEnvironmentMap'), 1);
    }

    const renderModel = currentModel === 'bunny' ? bunnyModel : dragonModel;

    if (renderModel) {
      const posLocation = gl.getAttribLocation(program, 'aPosition');
      const normalLocation = gl.getAttribLocation(program, 'aNormal');

      gl.bindBuffer(gl.ARRAY_BUFFER, renderModel.vertex);
      gl.enableVertexAttribArray(posLocation);
      gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, renderModel.normal);
      gl.enableVertexAttribArray(normalLocation);
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

      // Bind texture coordinates if using textured program
      if (program === texturedProgram) {
        const texCoordLocation = gl.getAttribLocation(program, 'aTexCoord');
        if (texCoordLocation !== -1) {
          gl.bindBuffer(gl.ARRAY_BUFFER, renderModel.texCoord);
          gl.enableVertexAttribArray(texCoordLocation);
          gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        }
      }

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderModel.index);
      gl.drawElements(gl.TRIANGLES, renderModel.indexCount, renderModel.indexType, 0);
    }
  }

  function update() {
    rotation += 0.01;
    frameCount++;
  }

  function animationLoop() {
    update();
    render();
    requestAnimationFrame(animationLoop);
  }

  function createLightControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.top = '10px';
    controlsDiv.style.left = '10px';
    controlsDiv.style.background = 'rgba(0,0,0,0.7)';
    controlsDiv.style.color = 'white';
    controlsDiv.style.padding = '10px';
    controlsDiv.style.fontFamily = 'Arial';
    controlsDiv.style.fontSize = '14px';

    const modelDiv = document.createElement('div');
    modelDiv.innerHTML = 'Model: ';
    const modelSelect = document.createElement('select');
    modelSelect.innerHTML = '<option value="bunny">Bunny</option><option value="dragon">Dragon</option>';
    modelSelect.onchange = (e) => currentModel = e.target.value;
    modelDiv.appendChild(modelSelect);
    controlsDiv.appendChild(modelDiv);

    const renderingDiv = document.createElement('div');
    renderingDiv.innerHTML = 'Rendering Mode: ';
    const renderingSelect = document.createElement('select');
    renderingSelect.innerHTML = `
      <option value="normal">Normal (Diffuse + Specular)</option>
      <option value="textured">Textured (Bunny only)</option>
      <option value="reflection">100% Reflection (Bunny only)</option>
      <option value="mixed">Mixed 80/20 (Bunny only)</option>
    `;
    renderingSelect.onchange = (e) => renderingMode = e.target.value;
    renderingDiv.appendChild(renderingSelect);
    controlsDiv.appendChild(renderingDiv);

    lights.forEach((light, index) => {
      const lightDiv = document.createElement('div');
      lightDiv.innerHTML = `Light ${index + 1}: `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = light.enabled;
      checkbox.onchange = (e) => lights[index].enabled = e.target.checked;

      lightDiv.appendChild(checkbox);
      lightDiv.appendChild(document.createTextNode(` (${light.color.join(', ')})`));
      controlsDiv.appendChild(lightDiv);
    });

    document.body.appendChild(controlsDiv);
  }

  async function initialize() {
    console.log('Initializing PLY renderer...');

    if (!gl) {
      console.error('WebGL 2 not supported.');
      document.body.innerHTML = "WebGL 2 is not available.";
      return;
    }

    const ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
      console.warn('OES_element_index_uint not supported - large models may not render');
    }

    try {
      const vertexShaderSource = await loadFileFromServer('shaders/simple.vert');
      const fragmentShaderSource = await loadFileFromServer('shaders/simple.frag');
      shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

      if (!shaderProgram) {
        console.error('Failed to create shader program');
        return;
      }

      // Load skybox shaders
      const skyboxVertexSource = await loadFileFromServer('shaders/skybox.vert');
      const skyboxFragmentSource = await loadFileFromServer('shaders/skybox.frag');
      skyboxProgram = createShaderProgram(gl, skyboxVertexSource, skyboxFragmentSource);

      if (!skyboxProgram) {
        console.error('Failed to create skybox shader program');
        return;
      }

      // Load textured shaders
      const texturedVertexSource = await loadFileFromServer('shaders/textured.vert');
      const texturedFragmentSource = await loadFileFromServer('shaders/textured.frag');
      texturedProgram = createShaderProgram(gl, texturedVertexSource, texturedFragmentSource);

      if (!texturedProgram) {
        console.error('Failed to create textured shader program');
        return;
      }

      // Load reflection shaders
      const reflectionVertexSource = await loadFileFromServer('shaders/reflection.vert');
      const reflectionFragmentSource = await loadFileFromServer('shaders/reflection.frag');
      reflectionProgram = createShaderProgram(gl, reflectionVertexSource, reflectionFragmentSource);

      if (!reflectionProgram) {
        console.error('Failed to create reflection shader program');
        return;
      }

      // Load mixed shaders
      const mixedVertexSource = await loadFileFromServer('shaders/reflection.vert'); // Same vertex shader
      const mixedFragmentSource = await loadFileFromServer('shaders/mixed.frag');
      mixedProgram = createShaderProgram(gl, mixedVertexSource, mixedFragmentSource);

      if (!mixedProgram) {
        console.error('Failed to create mixed shader program');
        return;
      }

      console.log('Loading bunny model...');
      const bunnyData = await parsePLYFile('assets/models/bunny.ply');
      bunnyModel = createModelBuffers(gl, bunnyData);
      console.log(`Bunny loaded: ${bunnyData.vertexCount} vertices, ${bunnyData.faceCount} faces`);

      console.log('Loading dragon model...');
      const dragonData = await parsePLYFile('assets/models/dragon.ply');
      dragonModel = createModelBuffers(gl, dragonData);
      console.log(`Dragon loaded: ${dragonData.vertexCount} vertices, ${dragonData.faceCount} faces`);

      // Load skybox
      console.log('Loading skybox...');
      skyboxModel = createSkyboxGeometry(gl);
      const faces = [
        'assets/textures/posx.jpg',
        'assets/textures/negx.jpg',
        'assets/textures/posy.jpg',
        'assets/textures/negy.jpg',
        'assets/textures/posz.jpg',
        'assets/textures/negz.jpg'
      ];
      skyboxTexture = await loadCubeMap(gl, faces);
      console.log('Skybox loaded');

      // Load bunny texture
      console.log('Loading bunny texture...');
      bunnyTexture = await loadTexture(gl, 'assets/textures/bunny_texture.jpg');
      console.log('Bunny texture loaded');

      createLightControls();
      requestAnimationFrame(animationLoop);

    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  initialize();
}());