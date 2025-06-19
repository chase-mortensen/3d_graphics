#version 300 es

precision highp float;

in vec3 vTexCoord;

uniform samplerCube uSkybox;

out vec4 outColor;

void main()
{
    outColor = texture(uSkybox, vTexCoord);
}