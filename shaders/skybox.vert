#version 300 es

in vec3 aPosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;

out vec3 vTexCoord;

void main()
{
    // Remove translation from view matrix to keep skybox stationary
    mat4 viewMatrixNoTranslation = mat4(mat3(uViewMatrix));
    
    vec4 pos = uProjectionMatrix * viewMatrixNoTranslation * vec4(aPosition, 1.0);
    gl_Position = pos.xyww; // Set z to w to ensure skybox is always at far plane
    
    vTexCoord = aPosition;
}