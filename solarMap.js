var isSolarOpen = false;
$("#openSolar").click(function(){
    if (!isSolarOpen)
    {
        $.when(
            $.get("SolarSystemEphemeris.csv")
        ).then(function(csvData) {
            EPHEMERIS = $.csv.toArrays(csvData);
            createSolarMap();
            isSolarOpen = true;
        });
        
    }
    document.getElementById("dateRange").style.display = "block";
    document.getElementById("slideoutCalc_tab").style.display = "block";
    document.getElementById("slideoutColony_tab").style.display = "block";
    document.getElementById("slideoutSystem_tab").style.display = "block";
});

$("#dateSlide").change(function(){
    var baseDate = new Date("01/01/2030");
    var val = document.getElementById("dateSlide").value;
    baseDate.setMonth(baseDate.getMonth()+val);

    document.getElementById("dateShow").innerHTML = month_abbv[baseDate.getMonth()] + " - " + baseDate.getFullYear();
 
    solarMap.removeLayer(solarSystem);
    var solarSystemLayers = createSolarSystem(baseDate);
    var solarPlanets = new L.LayerGroup(solarSystemLayers[0]);
    var solarOrbits = new L.LayerGroup(solarSystemLayers[1]);
    solarSystem = new L.LayerGroup([solarOrbits, solarPlanets]).addTo(solarMap);
    if(solarMap.hasLayer(dwarfPlanets))
    {
        solarMap.removeLayer(dwarfPlanets);
        var dwarfLayers = createOrbits(baseDate, "Dwarf", "Sun", "white", "white");
        var dwarfPoints = new L.LayerGroup(dwarfLayers[0]);
        var dwarfOrbits = new L.LayerGroup(dwarfLayers[1]);
        dwarfPlanets = new L.LayerGroup([dwarfOrbits, dwarfPoints]).addTo(solarMap);
    }
    if(solarMap.hasLayer(tnoPlanets))
    {
        solarMap.removeLayer(tnoPlanets);
        var tnoLayers = createOrbits(baseDate, "TNO", "Sun", "white", "white");
        var tnoPoints = new L.LayerGroup(tnoLayers[0]);
        var tnoOrbits = new L.LayerGroup(tnoLayers[1]);
        tnoPlanets = new L.LayerGroup([tnoOrbits, tnoPoints]).addTo(solarMap);
    }
});

const month_abbv = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const planetInfo = [
    "<b>Mercury</b>",
    "<b>Venus</b>",
    "<b>Earth</b><br>Population: 8 billion",
    "<b>Mars</b><br>Icaria Colony<br>Elysium Colony",
    "<b>Jupiter</b>",
    "<b>Saturn</b>",
    "<b>Uranus</b>",
    "<b>Neptune</b>",
    "<b>Pluto</b>",
]
var EPHEMERIS = [];
var BASE_DATE = new Date("01/01/2030"); // Time when initial ephemiris was made (we calculate subsequent theta from L)
var solarSystem = new L.LayerGroup();
var dwarfPlanets = new L.LayerGroup();
var tnoPlanets = new L.LayerGroup();
var solarMap;

function createSolarSystem(analysisDate)
{
    var sun = L.circle([0, 0], {
        color: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 1,
        radius: 0.08
    });
    
    var planets = [sun];
    var planetOrbits = [];
    var planetColors = ["","#8a8a8a", "#fcfab1", "#0008ff", "#ff0000", "#ffb700", "#f5cf71", "#69ffaf", "#64acfa", "#8a8a8a"];

    // Kepler Elements from JPL Horizons
    // Simple params: https://ssd.jpl.nasa.gov/planets/approx_pos.html
    // Detailed Ephemeris: https://ssd.jpl.nasa.gov/horizons/app.html#/
    //var kepler_a = [0.38709927, 0.72333566, 1.00000261, 1.52371034, 5.20288700, 9.53667594, 19.18916464, 30.06992276, 39.285758];     // Semi-major axis (size)
    //var kepler_e = [0.20563593, 0.00677672, 0.01671123, 0.09339410, 0.04838624, 0.05386179, 0.04725744, 0.00859048, 0.24604374];     // Eccentricity (shape)
    //var kepler_L = [252.25032350, 181.97909950, 100.46457166, -4.55343205, 34.39644051, 49.95424423, 313.23810451, -55.12002969, 23.8];     // Mean Longitude (position at Jan 1, 2000)
    //var kepler_thetaPeriod = [87.9691, 224.7, 365, 687, 4331, 10747, 30589, 59800, 366.73, 2342.2]; // Orbital period (Earth Days)

    var daysSince2000 = (analysisDate.getTime() - BASE_DATE.getTime())/(1000 * 3600 * 24);
    for (let i = 1; i < EPHEMERIS.length; i++) {
        var planetData = EPHEMERIS[i];
        // Is this a planet orbiting the sun?
        if (planetData[13] != "Planet" || planetData[14] != "Sun")
        {
            continue;
        }
        // If so, let's collect the data:
        var name = planetData[0]; 
        var kepler_e = parseFloat(planetData[1]);  // Eccentricity
        var kepler_q = parseFloat(planetData[2]);  // Periapsis Distance (AU)
        var kepler_i = parseFloat(planetData[3]);  // Inclination
        var kepler_om = parseFloat(planetData[4]); // Longitude of Ascending NOde
        var kepler_w = parseFloat(planetData[5]);  // Argument of Perifocus
        var kepler_Tp = parseFloat(planetData[6]); // Time of Periapsis
        var kepler_n = parseFloat(planetData[7]);  // Mean Motion
        var kepler_M = parseFloat(planetData[8]);  // Mean Anomaly
        var kepler_nu = parseFloat(planetData[9]); // True Anomaly
        var kepler_a = parseFloat(planetData[10]); // Semi-major axis
        var kepler_AD = parseFloat(planetData[11]);// Apoapsis distance
        var kepler_PR = parseFloat(planetData[12]);// Sidereal orbit period (days)

        var f = getKeplerLinearEccentricity(kepler_a, kepler_e);
        var b = getKeplerMinorAxis(kepler_a, kepler_e);
        var theta = getKeplerTrueAnomaly(kepler_M, kepler_PR, daysSince2000);
        
        var planetPosition = getKeplerObjectPosition2D(kepler_a, kepler_e, theta);
        
        // Plot Point
        var orbitLine = L.ellipse([0, -f], [kepler_a, b], 0, {
            color: 'white',
            fillColor: 'yellow',
            fillOpacity: 0,
            weight: 0.5
        });
        planetOrbits.push(orbitLine);

        var planetMark = L.circle([planetPosition[0], planetPosition[1]], {
            color: planetColors[i],
            fillColor: planetColors[i],
            fillOpacity: 1,
            radius: 0.05
        });
        planetMark.bindTooltip(name, {className: "mapLabelMedOrg"});
        planets.push(planetMark);
    }
    
    return [planets, planetOrbits]
}

function createOrbits(analysisDate, objectType, parentObject, pointColor, orbitColor)
{
    var bodies = [];
    var bodyOrbits = [];

    var daysSince2000 = (analysisDate.getTime() - BASE_DATE.getTime())/(1000 * 3600 * 24);
    for (let i = 1; i < EPHEMERIS.length; i++) {
        var planetData = EPHEMERIS[i];
        // Is this a planet orbiting the sun?
        if (planetData[13] != objectType || planetData[14] != parentObject)
        {
            continue;
        }
        // If so, let's collect the data:
        var name = planetData[0]; 
        var kepler_e = parseFloat(planetData[1]);  // Eccentricity
        var kepler_q = parseFloat(planetData[2]);  // Periapsis Distance (AU)
        var kepler_i = parseFloat(planetData[3]);  // Inclination
        var kepler_om = parseFloat(planetData[4]); // Longitude of Ascending NOde
        var kepler_w = parseFloat(planetData[5]);  // Argument of Perifocus
        var kepler_Tp = parseFloat(planetData[6]); // Time of Periapsis
        var kepler_n = parseFloat(planetData[7]);  // Mean Motion
        var kepler_M = parseFloat(planetData[8]);  // Mean Anomaly
        var kepler_nu = parseFloat(planetData[9]); // True Anomaly
        var kepler_a = parseFloat(planetData[10]); // Semi-major axis
        var kepler_AD = parseFloat(planetData[11]);// Apoapsis distance
        var kepler_PR = parseFloat(planetData[12]);// Sidereal orbit period (days)

        var f = getKeplerLinearEccentricity(kepler_a, kepler_e);
        var b = getKeplerMinorAxis(kepler_a, kepler_e);
        var theta = getKeplerTrueAnomaly(kepler_M, kepler_PR, daysSince2000);
        
        var planetPosition = getKeplerObjectPosition2D(kepler_a, kepler_e, theta);
        
        // Plot Point
        var orbitLine = L.ellipse([0, -f], [kepler_a, b], 0, {
            color: pointColor,
            fillColor: pointColor,
            fillOpacity: 0,
            weight: 0.5
        });
        bodyOrbits.push(orbitLine);

        var bodyMark = L.circle([planetPosition[0], planetPosition[1]], {
            color: orbitColor,
            fillColor: orbitColor,
            fillOpacity: 1,
            radius: 0.05
        });
        bodyMark.bindTooltip(name, {className: "mapLabelMedOrg"});
        bodies.push(bodyMark);
    }
    
    return [bodies, bodyOrbits];
    
}

function createSolarMap()
{
    // Initialize Map    
    solarMap = L.map('solarMapCanvas', {
        crs: L.CRS.Simple, 
        zoomSnap:0.1, 
        maxZoom:6, 
        minZoom:-1, 
        maxBoundsViscosity: 1.0
    }).setView([0, 0], 3);

    var measureControl = new L.Control.MeasureSimple({
        units: 'AU'
    });
    measureControl.addTo(solarMap);

    // Limit Map Bounds
    var southWest = L.latLng(-60, -60);
    var northEast = L.latLng(60, 60);
    var bounds = L.latLngBounds(southWest, northEast);
    solarMap.setMaxBounds(bounds);

    solarMap.attributionControl.setPrefix(false);
    solarMap.attributionControl._attributions = {};
    solarMap.attributionControl.addAttribution("Not for Actual Space Navigation")
    L.control.scale().addTo(solarMap);

    // Create solar system layer
    var analysisDate = new Date("01/01/2030");

    var solarSystemLayers = createSolarSystem(analysisDate);
    var solarPlanets = new L.LayerGroup(solarSystemLayers[0]);
    var solarOrbits = new L.LayerGroup(solarSystemLayers[1]);
    solarSystem = new L.LayerGroup([solarOrbits, solarPlanets]).addTo(solarMap);

    var dwarfLayers = createOrbits(analysisDate, "Dwarf", "Sun", "white", "white");
    var dwarfPoints = new L.LayerGroup(dwarfLayers[0]);
    var dwarfOrbits = new L.LayerGroup(dwarfLayers[1]);
    dwarfPlanets = new L.LayerGroup([dwarfOrbits, dwarfPoints]);

    var tnoLayers = createOrbits(analysisDate, "TNO", "Sun", "white", "white");
    var tnoPoints = new L.LayerGroup(tnoLayers[0]);
    var tnoOrbits = new L.LayerGroup(tnoLayers[1]);
    tnoPlanets = new L.LayerGroup([tnoOrbits, tnoPoints]);


    var solarBaseLayers = {
        "Solar System": solarSystem
    };
    var solarOverlays = {
        "Dwarf Planets": dwarfPlanets,
        "Trans-Neptunian Objects": tnoPlanets,
    };

    L.control.layers(solarBaseLayers, solarOverlays, {collapsed: false}, autoZIndex=true, hideSingleBase=true).addTo(solarMap);
}

function getKeplerObjectPosition2D(a, e, theta)
{
    // Finds the position of an orbiting object given
    // the major axis (a), eccentricity (e), and true anomaly (theta)

    // Find distance of object
    var D = (a * (1 - Math.pow(e, 2)))/(1+(e*Math.cos(theta * (Math.PI/180))));

    // Convert angle and distance to X,Y Position
    var X = D * Math.sin(theta * (Math.PI/180));
    var Y = D * Math.cos(theta * (Math.PI/180));

    return [X, Y];
}

function getKeplerTrueAnomaly(L, thetaPeriod, daysSinceMeasurement)
{
    // Function finds the true anomaly, theta
    // Number of orbits that planet has made based on time since J2000
    var orbits = daysSinceMeasurement / thetaPeriod;

    // Convert number of orbits to theta
    return ((orbits * 360) + L) % 360;
}

function getKeplerMinorAxis(a, e)
{
    return a * Math.sqrt(1 - Math.pow(e, 2)); // b
}

function getKeplerLinearEccentricity(a, e)
{
    return e * a; // f
}

function auToM(au)
{
    return au * 14960000000 // Real Scale
    //return au * 149600 // 10000x smaller
}
