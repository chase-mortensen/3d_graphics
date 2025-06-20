#version 300 es

precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;

uniform vec3 uLightPositions[3];
uniform vec3 uLightColors[3];
uniform bool uLightEnabled[3];
uniform vec3 uAmbientColor;
uniform vec3 uCameraPosition;
uniform float uSpecularExponent;
uniform samplerCube uEnvironmentMap;

out vec4 outColor;

void main()
{
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    
    // Calculate lighting (80%)
    vec3 lightingColor = uAmbientColor;
    
    for(int i = 0; i < 3; i++) {
        if(uLightEnabled[i]) {
            vec3 lightDir = normalize(uLightPositions[i] - vWorldPosition);
            
            // Diffuse component
            float diffuse = max(dot(normal, lightDir), 0.0);
            lightingColor += uLightColors[i] * diffuse * 0.8;
            
            // Specular component
            vec3 reflectDir = reflect(-lightDir, normal);
            float specular = pow(max(dot(viewDir, reflectDir), 0.0), uSpecularExponent);
            lightingColor += uLightColors[i] * specular * 0.3;
        }
    }
    
    // Calculate reflection (20%)
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 envColor = texture(uEnvironmentMap, reflectDir).rgb;
    
    // Create a procedural sky reflection as fallback
    vec3 topColor = vec3(0.5, 0.7, 1.0);    // Light blue
    vec3 bottomColor = vec3(0.2, 0.3, 0.6); // Darker blue
    vec3 horizonColor = vec3(0.8, 0.9, 1.0); // Near white
    
    // Use Y component of reflection vector for gradient
    float t = (reflectDir.y + 1.0) * 0.5; // Normalize -1,1 to 0,1
    
    vec3 skyColor;
    if (t > 0.7) {
        // Upper sky
        skyColor = mix(horizonColor, topColor, (t - 0.7) / 0.3);
    } else if (t > 0.3) {
        // Horizon
        skyColor = horizonColor;
    } else {
        // Lower sky
        skyColor = mix(bottomColor, horizonColor, t / 0.3);
    }
    
    // Mix environment texture with procedural sky (favor procedural for now)
    vec3 reflectionColor = mix(skyColor, envColor, 0.2);
    
    // Mix 80% lighting + 20% reflection
    vec3 finalColor = lightingColor * 0.8 + reflectionColor * 0.2;
    
    outColor = vec4(finalColor, 1.0);
}