function ae24Click(){
	
	$('#floatDiv_24hAnalyze').show('fast');
	
	// 初始化 Echarts 图表
	var myChart = echarts.init(document.getElementById("24hAnalyzeEcharts"));
	myChart.showLoading();

	$.ajax({
		type: 'get',
		url: 'http://localhost:8086/areaClacAnsC',
		data: { interval: 24 },
		dataType: 'json',
		success: function(dataObj) {

			var ecDataset = [];
			var dataset = [];
			dataObj.forEach(function(dataO) {
				var flag = 0;

				if(dataset.length != 0) {
					dataset.forEach(function(data) {
						if(data.areaID == dataO.areaID) {
							data.areaMes.push(dataO);
							flag = 1;
							return;
						}
					});
				}

				if(dataset.length == 0 || flag == 0) {
					var data = [];
					data.push(dataO);
					dataset.push({ areaID: dataO.areaID, areaName: dataO.areaName, areaMes: data });
				}
			});

			dataset.forEach(function(data) {
				data.areaMes.sort(function(a, b) { return a.calcTime > b.clacTime ? 1 : -1; });
			});

			var option = ({
				title: {
					text: '24小时区域出租车数量变化'
				},
				tooltip: {
					trigger: 'axis',
					show: false
				},
				grid: {
			        left: '3%',
			        right: '4%',
			        bottom: '3%',
			        containLabel: true
			    },
				xAxis: {
					type: 'time',
					boundaryGap: false
				},
				yAxis: {
					boundaryGap: [0, '50%'],
					type: 'value'
				},
				legend:{
					data: [],
					align: 'right',
				    left: '20%',
				    top: '10%'
				},
				series: []
			});

			dataset.forEach(function(area, i) {
				var areaAns = [];
				area.areaMes.forEach(function(areaAnsN, i) {
					var date = new Date(areaAnsN.calcTime);
					areaAns.push({
						name: date.toString(),
						value: [date, areaAnsN.taxiNum]
					});
				});

				option.series.push({
					name: area.areaName,
					type: 'line',
					showSymbol: false,
					hoverAnimation: false,
					data: areaAns
				});
				option.legend.data.push(area.areaName);

			});

			myChart.hideLoading();
			myChart.setOption(option);

			console.log("Area Echarts Div Data Opt => SUCCESS " + (new Date()).toString());
		},
		error: function(request, message, object) {
			console.log("Area Echarts Div Data Opt => ERROR : " + object + message + " " + (new Date()).toLocaleString());
		}
	});
}

function taxiVer(){
	var onlineTaxi = onlineTaxiMes;
	var num = document.getElementById("tnPost_num").value;
	var type = document.getElementById("tnPost_type").value;
	var flag = false;
	
	if(type == 'simNum'){
		onlineTaxi.forEach(function(taxi, i){
			if(num == taxi.phoneNum){
				$('#tnPost_alert_t').show();
				flag = true;
				return;
			}
		});
	}
	else{
		onlineTaxi.forEach(function(taxi, i){
			if(num == taxi.plateNum){
				$('#tnPost_alert_t').show();
				flag = true;
				return;
			}
		});
	}
	
	if(!flag){
		$('#tnPost_alert_w').show();
	}
	
	return;
}

function taxiNotice(){
	var onlineTaxi = onlineTaxiMes;
	var num = document.getElementById("tnPost_num").value;
	var type = document.getElementById("tnPost_type").value;
	
	var phoneNum;
	var flag = false;
	
	if(type == 'plateNum'){
		onlineTaxi.forEach(function(taxi, i){
			if(num == taxi.plateNum){
				phoneNum = taxi.phoneNum;
				flag = true;
				return;
			}
		});
	}
	else{
		onlineTaxi.forEach(function(taxi, i){
			if(num == taxi.phoneNum){
				flag = true;
				return;
			}
		});
	}
	
	if(!flag){
		$('#tnPost_alert_w').show();
		return;
	}
	
    $.ajax({
        type: 'post',
        url: 'http://localhost:8086/socketConnect',
        data: {
            tnPhoneNum: num,
            tnText: document.getElementById("tnPost_text").value
        },
        dataType: "json",
        success: function(){
            $('#tnPost_alert_s').show();
        },
        error: function(){
        		$('#tnPost_alert_e').show();
        }
    });
}