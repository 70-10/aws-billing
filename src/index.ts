#!/usr/bin/env node

import * as AWS from "aws-sdk";
import * as moment from "moment";
import { flatten, humanizeDollar } from "./util";
import * as Table from "cli-table2";

moment.locale("ja");
const CloudWatch = new AWS.CloudWatch({ region: "us-east-1" });

async function main() {
  const serviceNames = await getServiceNames();
  const yesterday = moment().subtract(1, "days");
  const billings = await getServiceBillings(serviceNames, yesterday);
  output(billings);
}

main().catch(console.error);

async function getServiceNames(): Promise<string[]> {
  const { Metrics } = await CloudWatch.listMetrics({
    MetricName: "EstimatedCharges",
    Namespace: "AWS/Billing"
  }).promise();
  if (!Metrics) {
    return [];
  }
  return flatten(Metrics.map((m: AWS.CloudWatch.Metric) => m.Dimensions))
    .filter((m: any) => m.Name === "ServiceName")
    .map((m: any) => m.Value);
}

async function getServiceBillings(serviceNames: string[], day: moment.Moment) {
  const startTime = day.startOf("day").toDate();
  const endTime = day.endOf("day").toDate();

  const yesterday = day.subtract(1, "days");
  const startTimeYesterday = yesterday.startOf("day").toDate();
  const endTimeYesterday = yesterday.endOf("day").toDate();

  const billings = await Promise.all(
    serviceNames.map(async (serviceName: string) => {
      const billing = await metricStatics(serviceName, startTime, endTime);
      return { service_name: serviceName, billing };
    })
  );
  const billings2 = await Promise.all(
    serviceNames.map(async (serviceName: string) => {
      const billing = await metricStatics(
        serviceName,
        startTimeYesterday,
        endTimeYesterday
      );
      return { service_name: serviceName, billing };
    })
  );

  return billings.map((e: any) => {
    const serviceName = e.service_name;
    const a: any = billings.filter(
      (e: any) => e.service_name === serviceName
    )[0];
    const b: any = billings2.filter(
      (e: any) => e.service_name === serviceName
    )[0];
    const diff = a.billing - b.billing;
    e.diff = diff;
    return e;
  });
}

async function metricStatics(
  serviceName: string,
  startTime: Date,
  endTime: Date
): Promise<number | undefined> {
  const { Datapoints } = await CloudWatch.getMetricStatistics({
    MetricName: "EstimatedCharges",
    Namespace: "AWS/Billing",
    Period: 86400,
    StartTime: startTime,
    EndTime: endTime,
    Statistics: ["Average"],
    Dimensions: [
      { Name: "Currency", Value: "USD" },
      { Name: "ServiceName", Value: serviceName }
    ]
  }).promise();
  if (!Datapoints || Datapoints.length <= 0) {
    return 0;
  }
  return Datapoints[0].Average;
}

function output(serviceBillings: any) {
  if (serviceBillings.length <= 0) {
    console.log("total: $0");
    return;
  }

  const totalBilling = serviceBillings
    .map((a: any) => a.billing)
    .reduce((prev: number, current: number) => prev + current);
  const diffTotal = serviceBillings
    .map((a: any) => a.diff)
    .reduce((prev: number, current: number) => prev + current);

  const table: any = new Table({ head: ["Service", "Cost", "Diff from yesterday"] });
  table.push(["Total", humanizeDollar(totalBilling), `+${humanizeDollar(diffTotal)}`]);

  serviceBillings.forEach((e: any) => {
    table.push([e.service_name, humanizeDollar(e.billing), `+${humanizeDollar(e.diff)}`]);
  });

  console.log(table.toString());
}
