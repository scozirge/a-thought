// Shift the final texture * vertex color, so baked green textures also change.
// Retain luminance detail, alpha, dark outlines, white cores and HDR intensity.
float3 NeonPalette(float3 c, float side)
{
    float hi=max(c.r,max(c.g,c.b));
    float lo=min(c.r,min(c.g,c.b));
    float saturation=(hi-lo)/max(hi,0.0001);
    float variation=saturate((c.g-c.r)/max(hi,0.0001)*.5+.5);
    float3 blue=lerp(float3(.24,.44,1),float3(.18,.78,1),variation);
    float3 red=lerp(float3(1,.17,.32),float3(1,.40,.22),variation);
    float strength=lerp(.26,.86,saturate(saturation*1.5));
    return hi*lerp(float3(1,1,1),lerp(blue,red,side),strength);
}
