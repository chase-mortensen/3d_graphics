#version 300 es

precision highp float;

in vec3 vTexCoord;

uniform samplerCube uSkybox;

out vec4 outColor;

void main()
{
    // Temporary: Mix texture with colored gradient to make skybox visible
    vec3 skyColor = texture(uSkybox, vTexCoord).rgb;
    
    // Create a simple gradient based on Y coordinate
    vec3 topColor = vec3(0.5, 0.7, 1.0);    // Light blue
    vec3 bottomColor = vec3(0.2, 0.3, 0.6); // Darker blue
    vec3 gradientColor = mix(bottomColor, topColor, (vTexCoord.y + 1.0) * 0.5);
    
    // Mix the texture with gradient to ensure visibility
    outColor = vec4(mix(gradientColor, skyColor, 0.7), 1.0);
}