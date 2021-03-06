/*
 * WebGL core teaching framwork 
 * (C)opyright Hartmut Schirmacher, hschirmacher.beuth-hochschule.de 
 *
 * Fragment Shader: phong
 *
 * expects position and normal vectors in eye coordinates per vertex;
 * expects uniforms for ambient light, directional light, and phong material.
 * 
 *
 */

precision mediump float;

uniform sampler2D daylightTexture;
uniform sampler2D nightlightTexture;
uniform sampler2D bathymetryTexture;
uniform sampler2D cloudTexture;


// position and normal in eye coordinates
varying vec4  ecPosition;
varying vec3  ecNormal;
varying vec2 texCoords;


// transformation matrices
uniform mat4  modelViewMatrix;
uniform mat4  projectionMatrix;

// Ambient Light
uniform vec3 ambientLight;

//nightlightTexture on/off
uniform bool booleanNight;

//clouds on/off
uniform bool boolClouds;

// Material
struct PhongMaterial {
    vec3  ambient;
    vec3  diffuse;
    vec3  specular;
    float shininess;
};
uniform PhongMaterial material;



// Light Source Data for a directional light
struct LightSource {

    int  type;
    vec3 direction;
    vec3 color;
    bool on;
    
} ;
uniform LightSource light;

/*

 Calculate surface color based on Phong illumination model.
 - pos:  position of point on surface, in eye coordinates
 - n:    surface normal at pos
 - v:    direction pointing towards the viewer, in eye coordinates
 + assuming directional light
 
 */
vec3 phong(vec3 pos, vec3 n, vec3 v, LightSource light, PhongMaterial material) {
    
    vec3 daylightColor = texture2D(daylightTexture, texCoords).rgb;
    vec3 nightlightColor = texture2D(nightlightTexture, texCoords).rgb;
    float bathymetryColor = texture2D(bathymetryTexture, texCoords).r;
    vec3 cloudColor = texture2D(cloudTexture, texCoords).rgb;
    float cloudColorAlpha = texture2D(cloudTexture, texCoords).a;
    
    if(bathymetryColor < 0.5){
        material.shininess = 10.0;
        material.specular = vec3(0.1, 0.1, 0.1);
    }
    else if(bathymetryColor > 0.5){
        material.shininess = 90.0;
        material.specular = vec3(1.0, 1.0, 1.0);
    }

    // ambient part
    vec3 ambient = material.ambient * ambientLight;
    
    // back face towards viewer?
    float ndotv = dot(n,v);
    if(ndotv < 0.0)
    return vec3(0,0,0);
    
    // vector from light to current point
    vec3 l = normalize(light.direction);
    
    // cos of angle between light and surface. 0 = light behind surface
    float ndotl = dot(n,-l);
    
    // diffuse contribution
    vec3 diffuse =  light.color * ndotl;
    
    // reflected light direction = perfect reflection direction
    vec3 r = reflect(l,n);
    
    // angle between reflection dir and viewing dir
    float rdotv = max( dot(r,v), 0.0);
    
    // specular contribution
    vec3 specular = material.specular *  light.color * pow(rdotv, material.shininess);
    
    float ndotlNorm = (ndotl + 1.0) / 2.0;
    
    if(boolClouds == true){
        if(cloudColorAlpha < 0.5) {
            material.diffuse = vec3(0.8,0.8,0.8);
            if(booleanNight == true){
                vec3 helligkeit = (1.0 - ndotlNorm) * nightlightColor + ndotlNorm * daylightColor;
                return helligkeit + specular + cloudColor*cloudColorAlpha;
            }else {
                return daylightColor*diffuse + specular + cloudColor*cloudColorAlpha;
            }
        }else{
            material.diffuse = vec3(0.1,0.1,0.1);
            if(booleanNight == true){
                vec3 helligkeit = (1.0 - ndotlNorm) * nightlightColor + ndotlNorm * daylightColor;
                return helligkeit + specular + cloudColor;
            }else {
                return daylightColor*diffuse + specular + cloudColor;
            }
        }

    } else{
        if(booleanNight == true){
            vec3 helligkeit = (1.0 - ndotlNorm) * nightlightColor + ndotlNorm * daylightColor;
            return helligkeit + specular;
        }else {
            return daylightColor*diffuse + specular;
        }
    }
}

void main() {
    
    // normalize normal after projection
    vec3 normalEC = normalize(ecNormal);
    
    // do we use a perspective or an orthogonal projection matrix?
    bool usePerspective = projectionMatrix[2][3] != 0.0;
    
    // for perspective mode, the viewing direction (in eye coords) points
    // from the vertex to the origin (0,0,0) --> use -ecPosition as direction.
    // for orthogonal mode, the viewing direction is simply (0,0,1)
    vec3 viewdirEC = usePerspective? normalize(-ecPosition.xyz) : vec3(0,0,1);
    
    // calculate color using phong illumination
    vec3 color = phong( ecPosition.xyz, normalEC, viewdirEC,
                       light, material );
    
    // set fragment color
    gl_FragColor = vec4(color, 1.0);
    
}
