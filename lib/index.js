#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const moment = require("moment");
const util_1 = require("./util");
moment.locale("ja");
const CloudWatch = new AWS.CloudWatch({ region: "us-east-1" });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceNames = yield getServiceNames();
        const yesterday = moment().subtract(1, "days");
        const billings = yield getServiceBillings(serviceNames, yesterday);
        output(billings);
    });
}
main().catch(console.error);
function getServiceNames() {
    return __awaiter(this, void 0, void 0, function* () {
        const { Metrics } = yield CloudWatch.listMetrics({
            MetricName: "EstimatedCharges",
            Namespace: "AWS/Billing"
        }).promise();
        if (!Metrics) {
            return [];
        }
        return util_1.flatten(Metrics.map((m) => m.Dimensions))
            .filter((m) => m.Name === "ServiceName")
            .map((m) => m.Value);
    });
}
function getServiceBillings(serviceNames, day) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = day.startOf("day").toDate();
        const endTime = day.endOf("day").toDate();
        const yesterday = day.subtract(1, "days");
        const startTimeYesterday = yesterday.startOf("day").toDate();
        const endTimeYesterday = yesterday.endOf("day").toDate();
        const billings = yield Promise.all(serviceNames.map((serviceName) => __awaiter(this, void 0, void 0, function* () {
            const billing = yield metricStatics(serviceName, startTime, endTime);
            return { service_name: serviceName, billing };
        })));
        const billings2 = yield Promise.all(serviceNames.map((serviceName) => __awaiter(this, void 0, void 0, function* () {
            const billing = yield metricStatics(serviceName, startTimeYesterday, endTimeYesterday);
            return { service_name: serviceName, billing };
        })));
        return billings.map((e) => {
            const serviceName = e.service_name;
            const a = billings.filter((e) => e.service_name === serviceName)[0];
            const b = billings2.filter((e) => e.service_name === serviceName)[0];
            const diff = a.billing - b.billing;
            e.diff = diff;
            return e;
        });
    });
}
function metricStatics(serviceName, startTime, endTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const { Datapoints } = yield CloudWatch.getMetricStatistics({
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
    });
}
function output(serviceBillings) {
    if (serviceBillings.length <= 0) {
        console.log("total: $0");
        return;
    }
    const totalBilling = serviceBillings
        .map((a) => a.billing)
        .reduce((prev, current) => prev + current);
    const diffTotal = serviceBillings
        .map((a) => a.diff)
        .reduce((prev, current) => prev + current);
    console.log(`total: ${util_1.humanizeDollar(totalBilling)} (+${util_1.humanizeDollar(diffTotal)})`);
    serviceBillings.forEach((e) => {
        console.log(`${e.service_name}: ${util_1.humanizeDollar(e.billing)} (+${util_1.humanizeDollar(e.diff)})`);
    });
}
