
//https://www.chartjs.org/docs/latest/charts/line.html

var totalSteps=400;

import Chart from '/node_modules/chart.js/auto/auto.js';


var colors=[
    "red",
    "green",
    "blue"
]


function computeIlumination(){

    
    var rangeX=200;
    var initialX=-rangeX/2;

    var result={
        
        "xAxis":[],
        "series":{
            "specular":{
                "red":[],
                "green":[],
                "blue":[]
            },
            "diffuse":{
                "red":[],
                "green":[],
                "blue":[]
            }
        }
    }

    var Kd=[0.5,0.25,1];
    var Ks=[0.75,0.5,0.1];


    for (var i=0;i<=totalSteps;i++){

        var x=initialX+rangeX*(i/totalSteps);
        result.xAxis.push(x.toFixed(2));
        
    }

    colors.forEach((color)=>{

        for (var i=0;i<=totalSteps;i++){
    
            result.series.diffuse[color].push(Math.sin(i/100));
            result.series.specular[color].push(Math.cos(i/150));
    
        }

    })



    return result;
}



function drawChart(info,serieKey, chartId){

    var ctx = document.getElementById(chartId);

    // valores del ejeX
    var labels=[];
    for (var [key,value] of Object.entries(info.xAxis)){
        labels.push(value);
    }
    
    
    var data={
        labels: labels,        
        datasets: []
    }

    var channels=["red","green","blue"];

    var i=0;

    channels.forEach((color) => {
     
        var serie={
            label:color,
            pointRadius:0,
            lineTension:0,
            data:info.series[serieKey][color],
            borderWidth:1,
            borderColor:color
        }

        data.datasets.push(serie);

    }) 


    var myChart = new Chart(ctx, {
        type: 'line',
        responsive:false,
        data: data,
        options: {
            title: {
                display: true,
                text: serieKey
            },
            layout: {
                padding: {
                    left: 20,
                    right: 20,
                    top: 20,
                    bottom: 20
                }
            }, //https://www.chartjs.org/docs/latest/axes/cartesian/
            scales: {
                xAxes: [{
                 /*   gridLines:{
                        display:false
                    },
                    ticks:{
                        autoSkip:true
                    }*/
                   
                }],
                yAxes: [{
                    gridLines:{
                        display:true
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });

}



var info=computeIlumination();

drawChart(info,"diffuse","chart1");
drawChart(info,"specular","chart2");