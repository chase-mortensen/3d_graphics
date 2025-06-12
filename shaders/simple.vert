#version 300 es

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

uniform vec3 uLightPositions[3];
uniform vec3 uLightColors[3];
uniform bool uLightEnabled[3];
uniform vec3 uAmbientColor;

out vec4 vColor;

void main()
{
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    
    vec3 worldPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
    vec3 normal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
    
    vec3 color = uAmbientColor;
    
    for(int i = 0; i < 3; i++) {
        if(uLightEnabled[i]) {
            vec3 lightDir = normalize(uLightPositions[i] - worldPosition);
            float diffuse = max(dot(normal, lightDir), 0.0);
            color += uLightColors[i] * diffuse;
        }
    }
    
    vColor = vec4(color, 1.0);
}