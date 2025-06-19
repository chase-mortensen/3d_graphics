#version 300 es

precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vTexCoord;

uniform vec3 uLightPositions[3];
uniform vec3 uLightColors[3];
uniform bool uLightEnabled[3];
uniform vec3 uAmbientColor;
uniform vec3 uCameraPosition;
uniform float uSpecularExponent;
uniform sampler2D uTexture;

out vec4 outColor;

void main()
{
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    
    // Sample texture
    vec3 textureColor = texture(uTexture, vTexCoord).rgb;
    
    vec3 color = uAmbientColor * textureColor;
    
    for(int i = 0; i < 3; i++) {
        if(uLightEnabled[i]) {
            vec3 lightDir = normalize(uLightPositions[i] - vWorldPosition);
            
            // Diffuse component
            float diffuse = max(dot(normal, lightDir), 0.0);
            color += uLightColors[i] * diffuse * textureColor * 0.8;
            
            // Specular component
            vec3 reflectDir = reflect(-lightDir, normal);
            float specular = pow(max(dot(viewDir, reflectDir), 0.0), uSpecularExponent);
            color += uLightColors[i] * specular * 0.3;
        }
    }
    
    outColor = vec4(color, 1.0);
}