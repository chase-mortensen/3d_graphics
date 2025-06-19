#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main()
{
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    
    vWorldPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
    vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
    vTexCoord = aTexCoord;
}