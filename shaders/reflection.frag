#version 300 es

precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;

uniform vec3 uCameraPosition;
uniform samplerCube uEnvironmentMap;

out vec4 outColor;

void main()
{
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    
    // Calculate reflection vector
    vec3 reflectDir = reflect(-viewDir, normal);
    
    // Sample the environment map
    vec3 reflectionColor = texture(uEnvironmentMap, reflectDir).rgb;
    
    outColor = vec4(reflectionColor, 1.0);
}