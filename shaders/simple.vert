#version 300 es

in vec4 aPosition;
in vec4 aColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec4 vColor;

void main()
{
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
    vColor = aColor;
}