import { bestChannelColor, activeChannelsColor, plotFont, percentageToFilterChannels } from "../styles/StyleConstants"; // Adjusted to match the file name case
import calculatePeakToPeakValues from "../utils/CalculationUtils";
import React, { useEffect } from "react";
import Plot from "plotly.js-dist";

function SingleTemplatePlot({ template_index, templateArray, samplingFrequency, activeIndices }) {
  useEffect(() => {
    const loadPlotData = async () => {
      if (!templateArray) return; // Exit early if templateArray is not available

      try {
        const singleTemplate = await templateArray.get([template_index, null, null]);
        const peak_to_peak_values = calculatePeakToPeakValues(singleTemplate);
        const bestChannel = peak_to_peak_values.indexOf(Math.max(...peak_to_peak_values));
        const singleTemplateBestChannel = singleTemplate.get([null, bestChannel]);

        const numberOfSamples = await singleTemplate.shape[0];
        const xData = Array.from({ length: numberOfSamples }, (_, i) => i);
        const timeMilliseconds = xData.map((value) => (value / samplingFrequency) * 1000.0);

        // Initialize an array to hold plot data for all channels
        let plotData = [];

        plotData.push({
          x: timeMilliseconds,
          y: singleTemplateBestChannel.data,
          type: "scatter",
          mode: "lines",
          line: {
            color: bestChannelColor,
            width: 5,
            opacity: 1,
          },
          name: "Best Channel",
          showlegend: true,
        });

        const numberOfChannels = await singleTemplate.shape[1];
        const firstActiveChannelIndex = activeIndices[0];
        activeIndices.forEach((channelIndex) => {
          plotData.push({
            x: timeMilliseconds,
            y: singleTemplate.get([null, channelIndex]).data,
            type: "scatter",
            mode: "lines",
            line: {
              color: activeChannelsColor,
              width: 0.5,
              opacity: 0.1,
            },
            name: `Active Channels`,
            legendgroup: "Active Channels",
            showlegend: firstActiveChannelIndex == channelIndex,
            visible: "legendonly",
          });
        });

        const plotLayout = {
          title: `Template Index: ${template_index}`,
          autosize: true,
          font: plotFont,
          xaxis: { title: "Time (ms)", showgrid: false },
          yaxis: { title: "Amplitude (uV)", showgrid: false },
          legend: {
            x: 0.1,
            y: 0.1,
            xanchor: "left",
            yanchor: "bottom",
          },
        };

        Plot.newPlot("plotDiv", plotData, plotLayout, { displayModeBar: false });
      } catch (error) {
        console.error("Error loading plot data:", error);
      }
    };

    loadPlotData();
  }, []); // Dependency array to re-run this effect when template_index or templateArray changes

  return <div id="plotDiv" style={{ width: "100%", height: "400px" }}></div>;
}

export default SingleTemplatePlot;
