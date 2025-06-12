MySample.main = (function() {
  'use strict';

  const canvas = document.getElementById('canvas-main');
  const gl = canvas.getContext('webgl2');

  let shaderProgram;
  let bunnyModel = null;
  let dragonModel = null;
  let currentModel = 'bunny';
  
  // Lighting state - default lights enabled
  let lights = [
    { position: [2.0, 2.0, 2.0], color: [1.0, 0.0, 0.0], enabled: true },
    { position: [-2.0, 2.0, 0.0], color: [0.0, 1.0, 0.0], enabled: true },
    { position: [0.0, -2.0, 2.0], color: [0.0, 0.0, 1.0], enabled: true }
  ];
  
  let ambientColor = [0.1, 0.1, 0.1];
  let rotation = 0;
  let frameCount = 0;

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
    const normals = new Float32Array(vertices.length);
    const vertexNormals = new Array(vertices.length / 3).fill(0).map(() => [0, 0, 0]);
    
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];
      
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
    
    const buffers = {
      vertex: gl.createBuffer(),
      normal: gl.createBuffer(),
      index: gl.createBuffer(),
      indexCount: plyData.indices.length,
      indexType: plyData.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      bounds: plyData.bounds
    };
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, plyData.vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plyData.indices, gl.STATIC_DRAW);
    
    return buffers;
  }

  function createNormalMatrix(modelMatrix) {
    const normalMatrix = new Float32Array(16);
    
    // Calculate 3x3 part of model matrix
    const m = modelMatrix;
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];
    
    // Calculate determinant
    const det = a00 * (a11 * a22 - a12 * a21) - 
                a01 * (a10 * a22 - a12 * a20) + 
                a02 * (a10 * a21 - a11 * a20);
    
    if (Math.abs(det) < 1e-10) {
      return createIdentityMatrix();
    }
    
    const invDet = 1.0 / det;
    
    // Calculate inverse transpose
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

  function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    
    if (!shaderProgram || (!bunnyModel && !dragonModel)) {
      return;
    }
    
    gl.useProgram(shaderProgram);
    
    // Set up matrices
    const projectionMatrix = createPerspectiveMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
    const viewMatrix = multiplyMatrix4x4(
      createTranslationMatrix(0, -1.0, -5.0),
      createRotationMatrixX(-0.3)
    );
    
    // Get current model for centering and scaling
    const model = currentModel === 'bunny' ? bunnyModel : dragonModel;
    let modelMatrix = createIdentityMatrix();
    
    if (model && model.bounds) {
      // Center the model
      const centerX = (model.bounds.minX + model.bounds.maxX) / 2;
      const centerY = (model.bounds.minY + model.bounds.maxY) / 2;
      const centerZ = (model.bounds.minZ + model.bounds.maxZ) / 2;
      
      // Calculate scale to make model reasonably sized (about 1 unit)
      const sizeX = model.bounds.maxX - model.bounds.minX;
      const sizeY = model.bounds.maxY - model.bounds.minY;
      const sizeZ = model.bounds.maxZ - model.bounds.minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      const scale = 1.5 / maxSize; // Scale to about 1.5 units
      
      // Build transformation: Rotation * Scale * Translation (to center)
      // This makes the model rotate around its own center
      const translationMatrix = createTranslationMatrix(-centerX, -centerY, -centerZ);
      const scaleMatrix = createScaleMatrix(scale, scale, scale);
      const rotationMatrix = multiplyMatrix4x4(
        createRotationMatrixY(rotation),
        createRotationMatrixX(rotation * 0.5)
      );
      
      // Apply transformations: center, scale, rotate, then move away from camera
      const centerTransform = multiplyMatrix4x4(scaleMatrix, translationMatrix);
      const rotatedTransform = multiplyMatrix4x4(rotationMatrix, centerTransform);
      const finalTranslation = createTranslationMatrix(0, 0, -2.0); // Move model away from camera
      modelMatrix = multiplyMatrix4x4(finalTranslation, rotatedTransform);
    }
    
    const normalMatrix = createNormalMatrix(modelMatrix);
    
    // Set uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'), false, transposeMatrix4x4(projectionMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'uViewMatrix'), false, transposeMatrix4x4(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'uModelMatrix'), false, transposeMatrix4x4(modelMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'uNormalMatrix'), false, transposeMatrix4x4(normalMatrix));
    
    // Set lighting uniforms
    const lightPositions = lights.map(light => light.position).flat();
    const lightColors = lights.map(light => light.color).flat();
    const lightEnabled = lights.map(light => light.enabled);
    
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'uLightPositions'), lightPositions);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'uLightColors'), lightColors);
    gl.uniform1iv(gl.getUniformLocation(shaderProgram, 'uLightEnabled'), lightEnabled);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'uAmbientColor'), ambientColor);
    
    // Render current model
    const renderModel = currentModel === 'bunny' ? bunnyModel : dragonModel;
    if (renderModel) {
      // if (frameCount < 5) {
      //   console.log(`Rendering ${currentModel} with ${renderModel.indexCount} indices`);
      // }
      const posLocation = gl.getAttribLocation(shaderProgram, 'aPosition');
      const normalLocation = gl.getAttribLocation(shaderProgram, 'aNormal');
      
      gl.bindBuffer(gl.ARRAY_BUFFER, renderModel.vertex);
      gl.enableVertexAttribArray(posLocation);
      gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, renderModel.normal);
      gl.enableVertexAttribArray(normalLocation);
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
      
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
    
    // Model switcher
    const modelDiv = document.createElement('div');
    modelDiv.innerHTML = 'Model: ';
    const modelSelect = document.createElement('select');
    modelSelect.innerHTML = '<option value="bunny">Bunny</option><option value="dragon">Dragon</option>';
    modelSelect.onchange = (e) => currentModel = e.target.value;
    modelDiv.appendChild(modelSelect);
    controlsDiv.appendChild(modelDiv);
    
    // Light controls
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
    
    // Enable extension for 32-bit indices if available
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
      
      // Load PLY models
      console.log('Loading bunny model...');
      const bunnyData = await parsePLYFile('models/bunny.ply');
      bunnyModel = createModelBuffers(gl, bunnyData);
      console.log(`Bunny loaded: ${bunnyData.vertexCount} vertices, ${bunnyData.faceCount} faces`);
      
      console.log('Loading dragon model...');
      const dragonData = await parsePLYFile('models/dragon.ply');
      dragonModel = createModelBuffers(gl, dragonData);
      console.log(`Dragon loaded: ${dragonData.vertexCount} vertices, ${dragonData.faceCount} faces`);
      
      createLightControls();
      requestAnimationFrame(animationLoop);
      
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }
  
  initialize();
}());