

//------------------------------------------------------------------
//
// Helper function used to load a file from the server
//
//------------------------------------------------------------------
async function loadFileFromServer(filename) {
    let result = await fetch(filename);
    return result.text();
}

//------------------------------------------------------------------
//
// Helper function to multiply two 4x4 matrices.
//
//------------------------------------------------------------------
function multiplyMatrix4x4(m1, m2) {
    let r = [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0];

    // Iterative multiplication
    // for (let i = 0; i < 4; i++) {
    //     for (let j = 0; j < 4; j++) {
    //         for (let k = 0; k < 4; k++) {
    //             r[i * 4 + j] += m1[i * 4 + k] * m2[k * 4 + j];
    //         }
    //     }
    // }

    // "Optimized" manual multiplication
    r[0] = m1[0] * m2[0] + m1[1] * m2[4] + m1[2] * m2[8] + m1[3] * m2[12];
    r[1] = m1[0] * m2[1] + m1[1] * m2[5] + m1[2] * m2[9] + m1[3] * m2[13];
    r[2] = m1[0] * m2[2] + m1[1] * m2[6] + m1[2] * m2[10] + m1[3] * m2[14];
    r[3] = m1[0] * m2[3] + m1[1] * m2[7] + m1[2] * m2[11] + m1[3] * m2[15];

    r[4] = m1[4] * m2[0] + m1[5] * m2[4] + m1[6] * m2[8] + m1[7] * m2[12];
    r[5] = m1[4] * m2[1] + m1[5] * m2[5] + m1[6] * m2[9] + m1[7] * m2[13];
    r[6] = m1[4] * m2[2] + m1[5] * m2[6] + m1[6] * m2[10] + m1[7] * m2[14];
    r[7] = m1[4] * m2[3] + m1[5] * m2[7] + m1[6] * m2[11] + m1[7] * m2[15];

    r[8] = m1[8] * m2[0] + m1[9] * m2[4] + m1[10] * m2[8] + m1[11] * m2[12];
    r[9] = m1[8] * m2[1] + m1[9] * m2[5] + m1[10] * m2[9] + m1[11] * m2[13];
    r[10] = m1[8] * m2[2] + m1[9] * m2[6] + m1[10] * m2[10] + m1[11] * m2[14];
    r[11] = m1[8] * m2[3] + m1[9] * m2[7] + m1[10] * m2[11] + m1[11] * m2[15];

    r[12] = m1[12] * m2[0] + m1[13] * m2[4] + m1[14] * m2[8] + m1[15] * m2[12];
    r[13] = m1[12] * m2[1] + m1[13] * m2[5] + m1[14] * m2[9] + m1[15] * m2[13];
    r[14] = m1[12] * m2[2] + m1[13] * m2[6] + m1[14] * m2[10] + m1[15] * m2[14];
    r[15] = m1[12] * m2[3] + m1[13] * m2[7] + m1[14] * m2[11] + m1[15] * m2[15];

    return r;
}

//------------------------------------------------------------------
//
// Transpose a matrix.
// Reference: https://jsperf.com/transpose-2d-array
//
//------------------------------------------------------------------
function transposeMatrix4x4(m) {
    let t = [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    ];
    return t;
}

//------------------------------------------------------------------
//
// Create an identity matrix
//
//------------------------------------------------------------------
function createIdentityMatrix() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

//------------------------------------------------------------------
//
// Create a translation matrix
//
//------------------------------------------------------------------
function createTranslationMatrix(x, y, z) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

//------------------------------------------------------------------
//
// Create a scale matrix
//
//------------------------------------------------------------------
function createScaleMatrix(sx, sy, sz) {
    return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ];
}

//------------------------------------------------------------------
//
// Create rotation matrices for each axis
//
//------------------------------------------------------------------
function createRotationMatrixX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
}

function createRotationMatrixY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];
}

function createRotationMatrixZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

//------------------------------------------------------------------
//
// Create perspective projection matrix
//
//------------------------------------------------------------------
function createPerspectiveMatrix(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, 0,
        0, 0, 2 * far * near * nf, -1
    ];
}

//------------------------------------------------------------------
//
// Create orthographic (parallel) projection matrix
//
//------------------------------------------------------------------
function createOrthographicMatrix(left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    return [
        -2 * lr, 0, 0, 0,
        0, -2 * bt, 0, 0,
        0, 0, 2 * nf, 0,
        (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
    ];
}

//------------------------------------------------------------------
//
// PLY file parser - handles ASCII format PLY files
//
//------------------------------------------------------------------
async function parsePLYFile(filename) {
    const data = await loadFileFromServer(filename);
    const lines = data.split('\n');
    
    let vertexCount = 0;
    let faceCount = 0;
    let vertices = [];
    let normals = [];
    let faces = [];
    let inHeader = true;
    let lineIndex = 0;
    
    // Parse header
    while (inHeader && lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (line.startsWith('element vertex')) {
            vertexCount = parseInt(line.split(' ')[2]);
        } else if (line.startsWith('element face')) {
            faceCount = parseInt(line.split(' ')[2]);
        } else if (line === 'end_header') {
            inHeader = false;
        }
        
        lineIndex++;
    }
    
    // Parse vertices
    for (let i = 0; i < vertexCount && lineIndex < lines.length; i++) {
        const line = lines[lineIndex].trim();
        if (line) {
            const parts = line.split(/\s+/);
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            const z = parseFloat(parts[2]);
            
            vertices.push(x, y, z);
            
            // If normals are provided (6+ values per line)
            if (parts.length >= 6) {
                const nx = parseFloat(parts[3]);
                const ny = parseFloat(parts[4]);
                const nz = parseFloat(parts[5]);
                normals.push(nx, ny, nz);
            }
        }
        lineIndex++;
    }
    
    // If no normals were provided, calculate them
    if (normals.length === 0) {
        normals = new Array(vertices.length).fill(0);
    }
    
    // Parse faces
    for (let i = 0; i < faceCount && lineIndex < lines.length; i++) {
        const line = lines[lineIndex].trim();
        if (line) {
            const parts = line.split(/\s+/).map(p => parseInt(p));
            const numVertices = parts[0];
            
            if (numVertices === 3) {
                // Reverse winding order to fix inside-out rendering
                faces.push(parts[1], parts[3], parts[2]);
            } else if (numVertices === 4) {
                // Convert quad to two triangles with correct winding
                faces.push(parts[1], parts[3], parts[2]);
                faces.push(parts[1], parts[4], parts[3]);
            }
        }
        lineIndex++;
    }
    
    // Use appropriate index type based on vertex count
    const indexArray = vertexCount > 65535 ? new Uint32Array(faces) : new Uint16Array(faces);
    
    // Calculate bounding box for debugging
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < vertices.length; i += 3) {
        minX = Math.min(minX, vertices[i]);
        maxX = Math.max(maxX, vertices[i]);
        minY = Math.min(minY, vertices[i + 1]);
        maxY = Math.max(maxY, vertices[i + 1]);
        minZ = Math.min(minZ, vertices[i + 2]);
        maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    
    // console.log(`Model bounds: X[${minX.toFixed(3)}, ${maxX.toFixed(3)}] Y[${minY.toFixed(3)}, ${maxY.toFixed(3)}] Z[${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`);
    
    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        indices: indexArray,
        vertexCount: vertexCount,
        faceCount: faces.length / 3,
        bounds: { minX, maxX, minY, maxY, minZ, maxZ }
    };
}
