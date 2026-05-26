"use client";

import { Tooltip as ReactTooltip } from "react-tooltip";

import dayjs from "dayjs";

import getConditionLevel from "./../../../../../../lib/helpers/getConditionLevel";

export default function ConditionsDetails({ toggelModal, haleConditions }) {
  if (!haleConditions) {
    return (
      <div className="space-y-6">
        <p>No conditions data available.</p>
        {/* Provide an option to add new conditions */}
        <button
          className="btn btn-outline btn-info mb-5 w-full"
          onClick={() => toggelModal()}
        >
          Add Conditions
        </button>
      </div>
    );
  }

  const emplyeeData = haleConditions.finalStorageResponsibleEmployee;

  const employee = {
    fullName: emplyeeData.name + " " + emplyeeData.surname,
    addresse: emplyeeData.address,
    lastDate: dayjs(haleConditions.createdAt).format("DD/MM/YYYY"),
    lastTime: dayjs(haleConditions.createdAt).format("HH:mm:ss"),
  };

  const conditionsData = {
    temperature: haleConditions.finalStorageTemperature,
    radiation: haleConditions.finalStorageRadiationLevel,
    humidity: haleConditions.finalStorageHumidity,
    pressure: haleConditions.finalStoragePressure,
  };

  const optimalFinalStorageConditions = (
    <div>
      <p>
        <b> Temperature:&ensp;</b> -5°C to 35°C
      </p>
      <p>
        <b> Radiation:&ensp;</b>0 to 0.1 μSv/h
      </p>
      <p>
        <b> Humidity:&ensp;</b> 40% to 60%
      </p>
      <p>
        <b> Pressure:&ensp;</b> 1010 hPa to 1020 hPa
      </p>
    </div>
  );

  const WarningFinalStorageConditions = (
    <div>
      <p>
        <b> Temperature:&ensp;</b> below -5°C to -25°C and above 35°C to 40°C
      </p>
      <p>
        <b> Radiation:&ensp;</b> 0.1 μSv/h to 0.5 μSv/h
      </p>
      <p>
        <b> Humidity:&ensp;</b> below 40% to 30% and above 60% to 70%
      </p>
      <p>
        <b> Pressure:&ensp;</b> below 1010 to 1000 hPa and above 1020 to 1030
        hPa
      </p>
    </div>
  );

  const DangerFinalStorageConditions = (
    <div>
      <p>
        <b> Temperature:&ensp;</b> below -25°C and above 40°C
      </p>
      <p>
        <b> Radiation:&ensp;</b> above 0.5 μSv/h
      </p>
      <p>
        <b> Humidity:&ensp;</b> below 30% to above 70%
      </p>
      <p>
        <b> Pressure:&ensp;</b> below 1000 hPa to above 1030 hPa
      </p>
    </div>
  );

  getConditionLevel;

  // Determine Condition Levels for All Parameters

  const conditionLevels = {
    temperature: getConditionLevel("temperature", conditionsData.temperature),
    radiation: getConditionLevel("radiation", conditionsData.radiation),
    humidity: getConditionLevel("humidity", conditionsData.humidity),
    pressure: getConditionLevel("pressure", conditionsData.pressure),
  };

  function conditionBorderColors() {
    if (
      conditionLevels.humidity === "danger" ||
      conditionLevels.pressure === "danger" ||
      conditionLevels.radiation === "danger" ||
      conditionLevels.temperature === "danger"
    ) {
      return "danger";
    }
    return "optimal";
  }

  function getBorderClass(conditionLevel) {
    switch (conditionLevel) {
      case "danger":
        return "border-2 border-orange-600 animate-pulse";

      default:
        return "border-gray-600";
    }
  }

  // Add Condition Levels to Class Names
  const conditionColors = {
    optimal: "border-green-600 bg-green-600",
    warning: "border-yellow-500 bg-yellow-500",
    danger: "border-red-500 bg-red-500 animate-ping",
    unknown: "border-gray-600 bg-gray-600",
  };

  return (
    <>
      <div className="prose flex flex-col items-center space-y-4">
        {/* Legenda */}
        <div className="mb-10 flex flex-row space-x-6">
          {/* Optimal */}
          <div className="flex flex-col items-center">
            <p className="mb-2">Optimal</p>
            <div
              className="h-6 w-6 cursor-pointer rounded border-2 border-green-600 bg-green-600 hover:scale-110"
              data-tooltip-id="optimalTooltip"
              data-tooltip-place="bottom"
            ></div>
            <ReactTooltip id="optimalTooltip">
              {optimalFinalStorageConditions}
            </ReactTooltip>
          </div>
          {/* Warning */}
          <div className="flex flex-col items-center">
            <p className="mb-2">Warning</p>

            <div
              className="h-6 w-6 cursor-pointer rounded border-2 border-yellow-500 bg-yellow-500 hover:scale-110"
              data-tooltip-id="warningTooltip"
              data-tooltip-place="bottom"
            ></div>
            <ReactTooltip id="warningTooltip">
              {WarningFinalStorageConditions}
            </ReactTooltip>
          </div>
          {/* Danger */}
          <div className="flex flex-col items-center">
            <p className="mb-2">Danger</p>

            <div
              className="h-6 w-6 cursor-pointer rounded border-2 border-red-600 bg-red-600 hover:scale-110"
              data-tooltip-id="dangerTooltip"
              data-tooltip-place="bottom"
            ></div>
            <ReactTooltip id="dangerTooltip">
              {DangerFinalStorageConditions}
            </ReactTooltip>
          </div>
        </div>

        {/* Parametars */}

        <div
          className={`stats stats-vertical ${getBorderClass(conditionBorderColors())} shadow lg:stats-horizontal`}
        >
          <div className="stat flex flex-col items-center">
            <div className="stat-title">Temperature</div>
            <div className="stat-value">
              {`${conditionsData.temperature} °C`}
            </div>
            <div className="stat-desc mt-3">
              <div
                className={`h-4 w-4 rounded hover:scale-110 ${
                  conditionColors[conditionLevels.temperature]
                }`}
              ></div>
            </div>
          </div>

          <div className="stat flex flex-col items-center border border-green-600">
            <div className="stat-title">Radiation</div>
            <div className="stat-value">{`${conditionsData.radiation} μSv/h`}</div>
            <div className="stat-desc mt-3">
              {" "}
              <div
                className={`h-4 w-4 rounded hover:scale-110 ${
                  conditionColors[conditionLevels.radiation]
                }`}
              ></div>
            </div>
          </div>

          <div className="stat flex flex-col items-center border border-green-600">
            <div className="stat-title">Humidity</div>
            <div className="stat-value">{`${conditionsData.humidity} %`}</div>
            <div className="stat-desc mt-3">
              {" "}
              <div
                className={`h-4 w-4 rounded hover:scale-110 ${
                  conditionColors[conditionLevels.humidity]
                }`}
              ></div>
            </div>
          </div>

          <div className="stat flex flex-col items-center border border-green-600">
            <div className="stat-title">Pressure</div>
            <div className="stat-value">{`${conditionsData.pressure} hPa`}</div>
            <div className="stat-desc mt-3">
              {" "}
              <div
                className={`h-4 w-4 rounded hover:scale-110 ${
                  conditionColors[conditionLevels.pressure]
                }`}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Update */}

      <div className="mt-16 flex flex-col space-y-8">
        <div className="overflow-x-auto">
          <table className="table">
            {/* head */}
            <thead>
              <tr>
                <th></th>
                <th className="text-lg">Last update by:</th>

                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* row 1 */}
              <tr>
                <th></th>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="mask mask-squircle h-14 w-14">
                        <img
                          src="https://img.daisyui.com/images/profile/demo/2@94.webp"
                          alt="Avatar Tailwind CSS Component"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{employee.fullName}</div>
                      <div className="text-sm opacity-50">
                        {employee.addresse}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <div className="font-bold">{employee.lastDate}</div>
                    <div className="text-sm opacity-50">
                      {employee.lastTime}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
            {/* foot */}
            <tfoot>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Time and Date</th>

                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Button open modal */}
        <button
          className="btn btn-outline btn-info mb-5 w-full transition delay-75 duration-200 ease-in-out hover:-translate-y-1 hover:scale-105"
          onClick={() => toggelModal()}
        >
          Update Conditions
        </button>
      </div>
    </>
  );
}
