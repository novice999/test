/* eslint-disable */

window.festina = window.festina || {};
window.festina.scrapingResult = window.festina.scrapingResult || {};
let documents = [];

window.festina.gui = {
    initialize: (a1, a2, failed) => {},
    createAndAddStatusTable: () => {
        return {
            addRow: (name) => {
                return {
                    updateStatus: (status) => {},
                };
            },
        };
    },
    addErrorsToContent: (errors) => {
        window.ReactNativeWebView?.postMessage(
            JSON.stringify({ error: errors[0] || "Der er opstået en ukendt fejl. Prøv igen senere." })
        );
    },
    setHeading: (heading) => {},
    showModal: () => {},
    addTextToContent: (text) => {},
    addCheckboxToContent: (text, callback) => {
        callback({ target: { checked: true } });
    },
    clearButtons: (bool) => {},
    addButton: (name, callback) => {
        callback();
    },
    addDisabledButton: (name, disabledText) => {},
    isDone: () => window.ReactNativeWebView?.postMessage(JSON.stringify({ done: true })),
};

/* ----------START functions for merging the 2 indkosmt files ----------- */
function mergeEindkomst(curYear, lastYear) {
    var parser = new DOMParser();
    var docCur = parser.parseFromString(curYear, "text/html");
    var docLast = parser.parseFromString(lastYear, "text/html");
    // get the HTMLCollections of nyside
    var curYearNodes = docCur.getElementsByClassName("nyside");
    var curYearLastNode = curYearNodes[curYearNodes.length - 1];
    var curYearInsertBeforeNode = curYearLastNode.nextSibling;
    while (curYearInsertBeforeNode != null && curYearInsertBeforeNode.nodeName != "TABLE") {
        curYearInsertBeforeNode = curYearInsertBeforeNode.nextSibling;
    }
    var parentNode = curYearLastNode.parentNode;

    var lastYearNodes = docLast.getElementsByClassName("nyside");

    // append all new nodes to the parent node
    var len = lastYearNodes.length;
    for (var i = 0; i < len; i++) {
        parentNode.insertBefore(lastYearNodes[i].cloneNode(true), curYearInsertBeforeNode);
    }
    // get the to and from for the merged doc
    var toFinalDate = getDocPeriodeToAsDate(docCur);

    // get the from date
    var fromFinalDate = getDocPeriodeFromAsDate(docLast);

    replaceFromToDate(docCur, fromFinalDate, toFinalDate);

    return docCur.documentElement.innerHTML;
}

var months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
var monthsLong = [
    "Januar",
    "Februar",
    "Marts",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "December",
];

/*
 * Transform 31-12-2019 to 2019-12-31 and return it as a Date object
 */
function getJSDateFromLocalString(localDate) {
    var newdate = localDate.split("-").reverse().join("-");
    return new Date(newdate);
}

function jsDateToSkatDate(aStrDate) {
    if (aStrDate == null) {
        return null;
    }
    return months[aStrDate.getMonth()] + ".&nbsp&nbsp" + aStrDate.getFullYear();
}

function getPeriodeNodeFromDoc(doc) {
    if (doc.forms[0] == null) {
        return null;
    }
    var allnodes = doc.forms[0].getElementsByTagName("table");
    var anode;
    for (var i = 0; i < allnodes.length; i++) {
        anode = allnodes[i];
        if (anode.innerText.indexOf("Periode:") < 0) continue;
        var tds = anode.getElementsByTagName("td");
        var periodNode = null;
        for (var j = 0; j < tds.length; j++) {
            if (tds[j].innerText.indexOf("Periode:") > -1) {
                periodNode = tds[j + 1];
                return periodNode;
            }
        }
    }
    return null;
}

function getDateFromPeriodeString(periodtext, searchFor) {
    // contains Lønperiode til: dato space or Lønperiode fra: dato space
    var newtext = periodtext.replace(/\s/g, "");
    var pos = newtext.indexOf(searchFor);
    if (pos < 0)
        // we dont want to error
        return new Date();

    var dateStr = newtext.substring(pos + searchFor.length, pos + searchFor.length + 10).trim();
    return new getJSDateFromLocalString(dateStr);
}

function replaceFromToDate(doc, datefrom, dateto) {
    var anode = getPeriodeNodeFromDoc(doc);
    if (anode != null) {
        if (datefrom == null && dateto != null) {
            datefrom = new Date(dateto.getTime());
            datefrom.setMonth(0);
        }
        let dates = jsDateToSkatDate(datefrom);
        dates = dates != null ? dates + " - " : "";
        let toDate = jsDateToSkatDate(dateto);
        if (toDate != null) {
            dates += toDate;
        }
        if (dates) {
            anode.innerHTML = dates;
        }
    }
}

function getDocPeriodeToAsDate(doc) {
    var anode = getPeriodeNodeFromDoc(doc);
    if (anode == null) return;
    var dates = anode.innerText.split("-");

    var moni = null;
    var year = null;
    if (dates[1].indexOf(".") != -1) {
        var monthstr = dates[1].split(".");
        moni = months.indexOf(monthstr[0].trim());
        year = parseInt(monthstr[1].trim());
    } else {
        var monthstr = dates[1].split(/(\s+)/).filter(function (e) {
            return e.trim().length > 0;
        });
        moni = monthsLong.indexOf(monthstr[0].trim());
        year = parseInt(monthstr[1].trim());
    }

    var date = new Date(year, moni, 1);
    return date;
}

function getDocPeriodeFromAsDate(doc) {
    var anode = getPeriodeNodeFromDoc(doc);
    if (anode == null) return;
    var dates = anode.innerText.split("-");

    var moni = null;
    var year = null;
    if (dates[0].indexOf(".") != -1) {
        var monthstr = dates[0].split(".");
        moni = months.indexOf(monthstr[0].trim());
        year = parseInt(monthstr[1].trim());
    } else {
        var monthstr = dates[0].split(/(\s+)/).filter(function (e) {
            return e.trim().length > 0;
        });
        moni = monthsLong.indexOf(monthstr[0].trim());
        year = parseInt(monthstr[1].trim());
    }

    var date = new Date(year, moni, 1);
    return date;
}

/* ----------END functions for merging the 2 indkosmt files ----------- */

window.festina.scraping = (function () {
    var settings = {
        timeout: 120000,
        advisorCaseUid: null,
        sambaServerUrl: null,
        uploadServerUrl: null,
        userToken: null,
        appTitle: null,
        logoUrl: null,
        resourceUrl: null,
        UIserverUrl: null,
        accessToken: null,
        activityId: null,
        subscriptionKey: null,
        userId: null,
    };

    var errorMessages = [];

    var showErrorMessageWithHeader = function (heading, message) {
        festina.gui.initialize(settings.UIserverUrl, settings.logoUrl, true);

        if (heading != undefined && heading != "") festina.gui.setHeading(heading);

        if (message != undefined && message != "") errorMessages.push(message);

        festina.gui.addErrorsToContent(errorMessages);
        errorMessages.length = 0;
        festina.gui.showModal();
    };

    var showErrorMessage = function (message) {
        showErrorMessageWithHeader(undefined, message);
    };

    var showInfoMessageWithHeader = function (heading, message) {
        festina.gui.initialize(settings.UIserverUrl, settings.logoUrl, true);

        if (heading != undefined && heading != "") festina.gui.setHeading(heading);

        if (message != undefined && message != "") festina.gui.addTextToContent(message);

        festina.gui.showModal();
    };

    var showInfoMessage = function (message) {
        showInfoMessageWithHeader(undefined, message);
    };

    function isUserLoggedIn(ssn, callback) {
        var req = new XMLHttpRequest();
        req.header = req.onerror = function () {
            showErrorMessage("Der opstod en fejl ved kommunikation med netbank.");
        };
        req.onload = function () {
            if (req.readyState == 4) {
                if (req.status != 200) {
                    showErrorMessage("Du er ikke logget korrekt ind.");
                } else {
                    callback();
                }
            }
        };
        req.ontimeout = function () {
            showErrorMessage("Kunne ikke kommunikere med netbank.");
        };
        req.open("GET", settings.sambaServerUrl + "/external/bookmarklet/" + settings.userId + "/isUserLoggedIn", true);
        if (!!settings.subscriptionKey) {
            req.setRequestHeader("ocp-apim-subscription-key", settings.subscriptionKey);
        }
        req.timeout = settings.timeout;
        req.withCredentials = true;
        console.log("checking login...");

        req.send();
    }

    function getUserId(callback) {
        console.log("Find user ID");
        var xhr = new XMLHttpRequest();

        xhr.ontimeout = xhr.onerror = function () {
            showErrorMessage("Kunne ikke finde skatteprofilen. Er du logget korrekt ind?");
        };
        xhr.onload = function () {
            if (xhr.readyState == 4) {
                if (xhr.status === 200) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(xhr.response, "text/html");
                    var ssn = doc.querySelector(".ident").innerText.replace(/\D/g, "");
                    if (!ssn || ssn.length !== 10) {
                        showErrorMessage("Kunne ikke finde skatteprofilen. Er du logget korrekt ind?");
                    } else {
                        settings.userId = ssn;
                        if (!settings.accessToken && !settings.activityId) {
                            isUserLoggedIn(ssn, callback);
                        } else {
                            callback();
                        }
                    }
                }
            }
        };
        xhr.open("GET", "https://www.tastselv.skat.dk/borger/profil/Profil.do");

        xhr.timeout = settings.timeout;

        xhr.send();
    }

    var scrape = function (
        sambServerUrl,
        uploadServerUrl,
        UIserverUrl,
        accessToken,
        activityId,
        subscriptionKey,
        appTitle,
        logoUrl
    ) {
        settings.sambaServerUrl = sambServerUrl;
        settings.uploadServerUrl = uploadServerUrl;
        settings.UIserverUrl = UIserverUrl;
        settings.accessToken = accessToken;
        settings.activityId = activityId;
        settings.subscriptionKey = subscriptionKey;
        // settings.resourceUrl = settings.serverUrl +
        // "/lsb/netbank/privat/kontiogbetalinger/kontooversigt/samba/bookmarklet";
        //settings.resourceUrl = settings.serverUrl + "/amok-web/bookmarklet-test";
        settings.appTitle = appTitle || "Lån & Spar";
        settings.logoUrl = logoUrl || "/logo-lsb.png";

        if (!!accessToken && !!subscriptionKey && !!activityId) {
            startScraping();
        } else {
            loadGui(settings.resourceUrl, function () {
                startScraping();
            });
        }
    };

    var startScraping = function () {
        var hostname = window.location.hostname;

        if (hostname.indexOf("tastselv.skat.dk") != -1) {
            getUserId(importTax);
        } else {
            showInfoMessage("Du skal stå på tastselv.skat.dk for at bruge denne funktion.");
        }
    };

    var prepareImportUi = function (thingsToImport, importFunction) {
        festina.gui.initialize(settings.UIserverUrl, settings.logoUrl);
        festina.gui.setHeading("Du er nu ved at sende dine oplysninger til " + settings.appTitle + ".");
        toggleStartButton(null);

        var importFunctionAsParameter = function () {
            importFunction(thingsToImport);
        };
        festina.gui.addCheckboxToContent(
            "Jeg giver tilladelse til at mine oplysninger sendes til " + settings.appTitle + " via en sikker forbindelse.",
            function (event) {
                toggleStartButton(event, importFunctionAsParameter);
            }
        );
        festina.gui.showModal();

        var table = festina.gui.createAndAddStatusTable();
        thingsToImport.forEach(function (elem, index) {
            var row = table.addRow(elem.text);
            thingsToImport[index].updateStatus = function (statusText) {
                festina.gui.clearButtons();
                row.updateStatus(statusText);
            };
        });
    };

    var importActivated = false;

    var toggleStartButton = function (event, importFunction) {
        // Start button cannot be deactivated, once activated.
        if (importActivated) {
            event.target.checked = true;
            return;
        }

        festina.gui.clearButtons(false);
        var buttonText = "Send oplysninger";
        if (event != null && event.target.checked) {
            festina.gui.addButton(buttonText, function () {
                importFunction();
            });
        } else {
            festina.gui.addDisabledButton(buttonText, "Du skal markere, at du giver tilladelse til at sende oplysninger");
        }
    };

    var doImport = function (thingsToImport, postUrl) {
        importActivated = true;

        var results = {};
        var formData = new FormData();

        formData.append("user", settings.userToken);
        formData.append("advisorCase", settings.advisorCaseUid);
        formData.append("type", postUrl);

        var scrapeContent = function (index) {
            if (index >= thingsToImport.length) {
                if (!!settings.accessToken) {
                    window.festina.scraping.continue = () => scrapingDone();
                    window.ReactNativeWebView?.postMessage(
                        JSON.stringify({
                            documents: thingsToImport.map(({ text, status }) => ({ name: text, status })),
                            ready: true,
                        })
                    );
                } else {
                    scrapingDone();
                }
            } else {
                var thingToImport = thingsToImport[index];
                thingToImport.updateStatus?.("loading");
                thingToImport["status"] = "loading";
                thingToImport.importFunction.call(
                    this,
                    thingToImport.timeout || 0,
                    function (error, result) {
                        if (!error) {
                            thingToImport.updateStatus?.("ok");
                            thingToImport["status"] = "ok";
                            results[thingToImport.formName] = result;
                            scrapeContent(index + 1);
                        } else {
                            thingToImport["status"] = "error";
                            thingToImport.updateStatus?.("error");
                            if (thingToImport.required) {
                                scrapingFailed(error);
                            } else {
                                scrapeContent(index + 1);
                            }
                        }
                    },
                    results
                );
            }
        };

        var scrapingFailed = function (error) {
            console.log("Error: " + error);
            var req = new XMLHttpRequest();
            req.open(
                "POST",
                settings.serverUrl + "/amok-web/views/task/templates/bookmarkletupload/receiveInformation.xhtml",
                true
            );
            req.timeout = settings.timeout;
            req.withCredentials = true;
            var formData = new FormData();
            formData.append("trialFailed", "true");
            req.send(formData);
            festina.gui.addErrorsToContent([error + "\nLuk denne dialog og prøv igen."]);
        };

        var scrapingDone = function () {
            /*
             * we got the results - now check and if needed merge the 2
             * 'lønindkomst' files
             */
            var eIndkomstKeys = [];
            for (const key in results) {
                console.log("key", key);
                if (key.indexOf("document_eindkomst") !== -1) {
                    eIndkomstKeys.push(key);
                }
            }
            eIndkomstKeys.push(eIndkomstKeys[0]);
            if (eIndkomstKeys.length > 1) {
                var mergedFile = null;
                for (const index in eIndkomstKeys) {
                    const eIndkomstKey = eIndkomstKeys[index];
                    if (mergedFile == null) {
                        mergedFile = results[eIndkomstKey];
                    } else {
                        mergedFile = mergeEindkomst(mergedFile, results[eIndkomstKey]);
                    }
                    delete results[eIndkomstKey];
                }
                results["document_eindkomst"] = mergedFile;
            }

            console.log("Sender oplysninger...");
            var initialCallResponses = [];
            var sendingTable = festina.gui.createAndAddStatusTable();
            var sendingStatusRow = sendingTable.addRow("Du sender dine oplysninger til " + settings.appTitle);
            sendingStatusRow.updateStatus("loading");

            var onTimeOutFunction = function () {
                festina.gui.addErrorsToContent(["Kunne ikke sende dine oplysninger. Der gik for lang tid."]);
                sendingStatusRow.updateStatus("error");
            };

            var onErrorFunction = function (e) {
                console.log("error", e);
                festina.gui.addErrorsToContent([
                    "Der skete en fejl ved sending af filer. Gå tilbage til netbanken og prøv igen.",
                ]);
                sendingStatusRow.updateStatus("error");
            };

            // festina.gui.addTextToContent("Du sender dine oplysninger til " +
            // settings.appTitle + ".....");
            var req = new XMLHttpRequest();
            req.onerror = function (e) {};

            req.onload = function () {
                if (req.readyState == 4 && req.status == 200) {
                    var responseInJason = JSON.parse(this.responseText);
                    responseInJason["file"] = blob;
                    initialCallResponses.push(responseInJason);
                } else {
                    festina.gui.addErrorsToContent([
                        "Kunne ikke sende dine oplysninger til " +
                            settings.appTitle +
                            " - Gå tilbage til netbanken og prøv igen.",
                    ]);
                    sendingStatusRow.updateStatus("error");
                }
            };
            req.ontimeout = onTimeOutFunction;

            var result = [];
            var blob;
            for (var prop in results) {
                var params = null;
                if (prop === "document_aarsopg_pdf" || prop === "document_pensionsinfo_rapport") {
                    blob = results[prop];
                    params = { fileName: prop + ".pdf", mimeType: "application/pdf", fileSize: blob.size };
                } else {
                    blob = new Blob([results[prop]], { type: "text/html" });
                    params = { fileName: prop + ".html", mimeType: "text/html", fileSize: blob.size };
                }
                req.open("POST", settings.uploadServerUrl + "/initiate", false);
                req.setRequestHeader("content-type", "application/json");
                if (!!settings.accessToken) {
                    req.setRequestHeader("Authorization", "Bearer " + settings.accessToken);
                }
                if (!!settings.subscriptionKey) {
                    req.setRequestHeader("ocp-apim-subscription-key", settings.subscriptionKey);
                }
                req.send(JSON.stringify(params));
            }

            var req2 = new XMLHttpRequest();

            req2.onload = function () {
                if (req2.readyState == 4 && req2.status == 200) {
                } else {
                    festina.gui.addErrorsToContent([
                        "Kunne ikke sende dine oplysninger til " + settings.appTitle + " - prøv igen.",
                    ]);
                    sendingStatusRow.updateStatus("error");
                }
            };
            req2.onerror = onErrorFunction;
            req2.ontimeout = onTimeOutFunction;
            initialCallResponses.forEach(sendFiles);

            function sendFiles(value) {
                var numberOfChunkSent = 0;
                var chunkSentTotal = 0;
                while (value.numberOfChunks > numberOfChunkSent) {
                    req2.open("PUT", settings.uploadServerUrl + "/" + value.id + "/chunks/" + numberOfChunkSent, false);
                    req2.setRequestHeader("content-type", "application/octet-stream");
                    if (!!settings.accessToken) {
                        req2.setRequestHeader("Authorization", "Bearer " + settings.accessToken);
                    }
                    if (!!settings.subscriptionKey) {
                        req2.setRequestHeader("ocp-apim-subscription-key", settings.subscriptionKey);
                    }
                    var chunkData = value.file.slice(chunkSentTotal, chunkSentTotal + value.chunkSize, "text/plain");
                    req2.send(chunkData);
                    chunkSentTotal = chunkSentTotal + value.chunkSize;
                    numberOfChunkSent++;
                }
            }

            //makeVerifyRequest();
            var numderOfFilesVerified = 0;
            Promise.race(
                initialCallResponses.map((r) => {
                    return makeVerifyRequest(r);
                })
            ).catch(() => {
                festina.gui.addErrorsToContent([
                    "Kunne ikke sende dine oplysninger til " + settings.appTitle + " - prøv igen.",
                ]);
                sendingStatusRow.updateStatus("error");
            });

            function makeVerifyRequest(value) {
                var req3 = new XMLHttpRequest();
                var idsInCookie = [];
                // Return it as a Promise
                return new Promise(function (resolve, reject) {
                    // Setup our listener to process compeleted requests
                    req3.onreadystatechange = function () {
                        // Only run if the request is complete
                        if (req3.readyState !== 4) return;
                        // Process the response
                        if (req3.status >= 200 && req3.status < 300) {
                            // If successful
                            resolve(req3);
                            if (JSON.parse(this.responseText).status === "COMPLETE") {
                                numderOfFilesVerified++;
                                if (initialCallResponses.length === numderOfFilesVerified) {
                                    uploadAllFiles();
                                }
                            }
                        } else {
                            reject();
                        }
                    };
                    req3.onerror = onErrorFunction;
                    req3.ontimeout = onTimeOutFunction;
                    req3.open("GET", settings.uploadServerUrl + "/" + value.id + "/status", true);
                    req3.setRequestHeader("content-type", "application/json");
                    if (!!settings.accessToken) {
                        req3.setRequestHeader("Authorization", "Bearer " + settings.accessToken);
                    }
                    if (!!settings.subscriptionKey) {
                        req3.setRequestHeader("ocp-apim-subscription-key", settings.subscriptionKey);
                    }
                    idsInCookie.push(value.id);
                    req3.send();
                });
            }

            function uploadAllFiles() {
                var uploadData = [];
                var hostname = window.location.hostname;
                initialCallResponses.forEach(prepareUploadData);

                function prepareUploadData(value) {
                    uploadData.push({
                        id: value.id,
                        documentType: hostname.indexOf("tastselv.skat.dk") ? "skat" : "Pension",
                    });
                }

                var dataToSend = { usingBookmarklet: true, files: uploadData };
                var req4 = new XMLHttpRequest();
                req4.onload = function () {
                    if (req4.readyState == 4 && req4.status == 200) {
                        window.ReactNativeWebView?.postMessage(JSON.stringify({ done: true }));
                        festina.gui.addTextToContent(settings.appTitle + " har nu modtaget dine oplysninger.");
                        festina.gui.clearButtons(true);
                        sendingStatusRow.updateStatus("ok");
                    } else {
                        festina.gui.addErrorsToContent([
                            "Kunne ikke sende dine oplysninger til " + settings.appTitle + " - prøv igen.",
                        ]);
                        sendingStatusRow.updateStatus("error");
                    }
                };
                req4.onerror = onErrorFunction;
                req4.ontimeout = onTimeOutFunction;
                req4.withCredentials = true;
                let requestUrl = settings.sambaServerUrl + "/external/bookmarklet/upload?ssn=" + settings.userId;
                if (!!settings.activityId) {
                    requestUrl += "&activityId=" + settings.activityId;
                }
                req4.open("PUT", requestUrl, false);
                req4.setRequestHeader("content-type", "application/json");
                if (!!settings.accessToken) {
                    req4.setRequestHeader("Authorization", "Bearer " + settings.accessToken);
                }
                if (!!settings.subscriptionKey) {
                    req4.setRequestHeader("ocp-apim-subscription-key", settings.subscriptionKey);
                }
                window.ReactNativeWebView?.postMessage(JSON.stringify({ bookmarkletStarted: true }));
                req4.send(JSON.stringify(dataToSend));
            }
        };

        scrapeContent(0);
    };

    var makeImportSkatteoplysninger = function (year, temporal) {
        return function (timeout, onsuccess) {
            importSkatteoplysninger(timeout, year, temporal, onsuccess);
        };
    };

    var importSkatteoplysninger = function (timeout, year, temporal, onsuccess) {
        var skatReq = new XMLHttpRequest();
        skatReq.ontimeout = function () {
            onsuccess("Import skatteoplysinger " + year + " timed ud.");
        };
        skatReq.onerror = function (e) {
            onsuccess("Kunne ikke hente dine skatteoplysninger for " + year + " (" + e + ").");
        };
        skatReq.onload = function () {
            if (
                (temporal && this.responseText.indexOf("at de oplysninger du ser her er foreløbige") != -1) ||
                (!temporal &&
                    this.responseText.indexOf("Rubriknr") != -1 &&
                    this.responseText.indexOf("at de oplysninger du ser her er foreløbige") == -1)
            ) {
                //var docEncoded = window.btoa(unescape(encodeURIComponent(this.responseText)));
                var docEncoded = this.responseText;
                onsuccess(undefined, docEncoded);
            } else {
                onsuccess(
                    "Kunne ikke hente dine skatteoplysninger for " + year + " - kontrollér om du stadig er logget ind."
                );
            }
        };
        skatReq.open("get", "https://www.tastselv.skat.dk/borger/r75?indkaar=" + year, true);
        skatReq.timeout = timeout;
        skatReq.send();
    };

    var makeAarsopgoerelseHTML = function (taxYear) {
        return function (timeout, onsuccess) {
            var onBusinessFailure = function () {
                importAarsopgoerelseHTML(timeout, taxYear - 1, onsuccess);
            };

            importAarsopgoerelseHTML(timeout, taxYear, onsuccess, onBusinessFailure);
        };
    };

    var importAarsopgoerelseHTML = function (timeout, taxYear, onsuccess, onfailure) {
        console.log("Henter årsopgørelse som HTML...");
        var skatReq = new XMLHttpRequest();
        skatReq.ontimeout = function () {
            onsuccess("Import årsopgørelse HTML timede ud.");
        };
        skatReq.onerror = function (e) {
            onsuccess("Kunne ikke hente din årsopgørelse som HTML (" + e + ").");
        };
        skatReq.onload = function () {
            if (this.responseText.indexOf("Personlig indkomst") != -1) onsuccess(undefined, this.responseText);
            else {
                if (typeof onfailure !== "undefined") {
                    onfailure();
                } else {
                    onsuccess("Kunne ikke hente din årsopgørelse som HTML - kontrollér om du stadig er logget ind.");
                }
            }
        };

        if (taxYear >= 2018) {
            skatReq.open("get", "https://www.tastselv.skat.dk/borger/seaaropg" + taxYear + "/VisListe.do", true);
        } else {
            skatReq.open("get", "https://www.tastselv.skat.dk/borger/seaaropg/VisListe.do", true);
        }

        skatReq.timeout = timeout;
        skatReq.send();
    };

    var importAarsopgoerelsePDF = function (timeout, onsuccess, results) {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(results.document_aarsopg, "text/html");

        var es = htmlDoc.getElementsByClassName("skts-pdf-icon");
        var year = htmlDoc.querySelectorAll(".nav-tabs li.active a")[0].id;
        console.log("Henter Årsopgørelse som PDF for år " + year);

        var timeoutFunc = function () {
            onsuccess("Import af årsopgørelse PDF timede ud");
        };

        var errorFunc = function (e) {
            onsuccess("Kunne ikke hente din årsopgørelse som PDF (" + e + ").");
        };

        var loadFunc = function () {
            var response = this.response;
            var reader = new FileReader();
            reader.addEventListener("loadend", function () {
                if (this.result.lastIndexOf("%PDF", 0) === 0) {
                    console.log("This is a PDF.. sending to Advisor");
                    onsuccess(
                        undefined,
                        new Blob([response], {
                            type: "application/pdf",
                        })
                    );
                } else {
                    console.log("Not a PDF..");
                    onsuccess("Årsopgørelsen var ikke en valid PDF rapport");
                }
            });

            reader.readAsText(this.response);
            // onsuccess(undefined, this.response);
        };

        if (es.length === 0) {
            onsuccess("Import af årsopgørelse som PDF afhænger af årsopgørelse som HTML");
            return;
        }

        for (var i = 0; i < es.length; i++) {
            var e = es[i];
            if (e.text.indexOf("PDF") === 0) {
                var js = e.getAttribute("onclick");
                js = js.substring(js.indexOf("(") + 1, js.indexOf(")"));
                var blknr = js.substring(1, js.indexOf(",") - 1);
                var registmp = js.substring(js.indexOf(",") + 3, js.lastIndexOf(",") - 1);
                var uid = js.substring(js.lastIndexOf(",") + 3, js.length - 1);

                var formData = new FormData();
                formData.append("blknr", blknr);
                formData.append("registmp", registmp);
                formData.append("indkaar", year);
                formData.append("slutkmnr", "");

                var skatReq = new XMLHttpRequest();
                skatReq.onerror = errorFunc;
                skatReq.ontimeout = timeoutFunc;
                skatReq.onload = loadFunc;
                if (year >= 2018) {
                    skatReq.open(
                        "POST",
                        "https://www.tastselv.skat.dk/borger/seaaropg" + year + "/VisPdf.do?uid=" + uid,
                        true
                    );
                } else {
                    skatReq.open("POST", "https://www.tastselv.skat.dk/borger/seaaropg/VisPdf.do?uid=" + uid, true);
                }
                skatReq.responseType = "blob";
                skatReq.timeout = timeout;
                skatReq.send(formData);

                return;
            }
        }
    };

    var makeImportIndkomstoplysninger = function (year, startMonth, endMonth) {
        return function (timeout, onsuccess) {
            importIndkomstoplysninger(timeout, year, startMonth, endMonth, onsuccess);
        };
    };

    var paddMonth = function (month) {
        if (("" + month).length === 1) {
            return "0" + month;
        }
        return month;
    };

    var importIndkomstoplysninger = function (timeout, year, startMonth, endMonth, onsuccess) {
        var params = "SEnr=*";
        params += "&periodeStartDto=" + paddMonth(startMonth);
        params += "&periodeSlutDto=" + paddMonth(endMonth);
        params += "&periodeIndkaar=" + year;
        params += "&valgtInkAar=" + year;
        params += "&valgtIndkAarLonIndh=" + year;
        params += "&radiobutton=londetail";
        params += "&sideNavn=udsogning";
        params += "&funktion=det";
        params += "&feltFunktion=*";
        params += "&EOF=OK";

        var skatReq = new XMLHttpRequest();
        skatReq.onerror = function (e) {
            onsuccess("Kunne ikke hente dine indkomstoplysninger (" + e + ").");
        };
        skatReq.ontimeout = function () {
            onsuccess("Import af indkomstoplysninger timede ud.");
        };
        skatReq.onload = function () {
            if (this.responseText.indexOf("periode fra:") != -1)
                // onsuccess(undefined, window.btoa(unescape(encodeURIComponent(this.responseText))));
                onsuccess(undefined, this.responseText);
            else onsuccess("Kunne ikke hente dine indkomstoplysninger - kontrollér om du stadig er logget ind.");
        };
        skatReq.open("POST", "https://www.tastselv.skat.dk/borger/letlon/detaljeret.do", true);
        skatReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        skatReq.timeout = timeout;
        skatReq.send(params);
    };

    var importTax = function () {
        if (window.location.pathname.indexOf("borger") == -1) {
            showInfoMessage("Du skal være logget ind og stå på velkomstsiden/forsiden.");
            return;
        }

        var taxYear = new Date().getFullYear() - 1;

        var incomeDate = new Date();
        incomeDate.setMonth(incomeDate.getMonth() - 1);

        var incomeMonth = incomeDate.getMonth() + 1; // add one because it is
        // zero based
        var runs = 0;
        var skatReq = new XMLHttpRequest();
        skatReq.ontimeout = function () {
            showErrorMessage("Der skete en fejl hos Skat - prøv igen senere.");
        };
        skatReq.onerror = function (e) {
            if (runs < 2) {
                skatReq.send();
            } else {
                showErrorMessage("Der skete en fejl hos Skat - prøv igen senere.");
            }
        };
        skatReq.onload = function () {
            if (this.responseText.indexOf("skts-logged-out") != -1) {
                showInfoMessage("Du bedes venligst logge ind først - tryk F5 for at opfriske siden.");
            } else if (
                this.responseText.indexOf("Rubriknr") != -1 &&
                this.responseText.indexOf("at de oplysninger du ser her er foreløbige") == -1
            ) {
                importTaxForYear(taxYear, incomeDate.getFullYear(), incomeMonth);
            } else {
                importTaxForYear(taxYear - 1, incomeDate.getFullYear(), incomeMonth);
            }
            runs++;
        };
        skatReq.open("get", "https://www.tastselv.skat.dk/borger/r75?indkaar=" + taxYear);
        skatReq.timeout = 0.5 * 60 * 1000;
        skatReq.send();
    };

    var importTaxForYear = function (taxYear, incomeYear, incomeMonth) {
        var thingsToImport = [
            {
                text: "Midlertidig skattemappe " + (taxYear + 1),
                formName: "document_temp_r75_" + (taxYear + 1),
                importFunction: makeImportSkatteoplysninger(taxYear + 1, true),
                timeout: 0.5 * 60 * 1000,
                required: false,
            },
            {
                text: "Skattemappe " + taxYear,
                formName: "document_r75_" + taxYear,
                importFunction: makeImportSkatteoplysninger(taxYear, false),
                timeout: 0.5 * 60 * 1000,
                required: false,
            },
            {
                text: "Skattemappe " + (taxYear - 1),
                formName: "document_r75_" + (taxYear - 1),
                importFunction: makeImportSkatteoplysninger(taxYear - 1, false),
                timeout: 0.5 * 60 * 1000,
                required: true,
            },
            {
                text: "Årsopgørelse som HTML",
                formName: "document_aarsopg",
                importFunction: makeAarsopgoerelseHTML(taxYear),
                timeout: 0.5 * 60 * 1000,
                required: true,
                encode: true,
            },
            {
                text: "Årsopgørelse som PDF",
                formName: "document_aarsopg_pdf",
                importFunction: importAarsopgoerelsePDF,
                timeout: 0.5 * 60 * 1000,
                required: false,
            },
            {
                text: "Indkomstoplysninger " + incomeYear,
                formName: "document_eindkomst" + incomeYear,
                importFunction: makeImportIndkomstoplysninger(incomeYear, 1, incomeMonth),
                timeout: 0.5 * 60 * 1000,
                required: false,
            },
        ];

        // Only add previous year if valid
        if (incomeMonth + 1 < 13) {
            thingsToImport.push({
                text: "Indkomstoplysninger " + (incomeYear - 1),
                formName: "document_eindkomst" + (incomeYear - 1),
                importFunction: makeImportIndkomstoplysninger(incomeYear - 1, incomeMonth + 1, 12),
                timeout: 0.5 * 60 * 1000,
                required: false,
            });
        }

        var importTaxFunc = function (thingsToImport) {
            doImport(thingsToImport, "UploadSkatDocuments");
        };
        prepareImportUi(thingsToImport, importTaxFunc);
    };

    var loadGui = function (serverUrl, callback) {
        var handleRequest = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    console.log("Gui script fetched...");
                    window.festina.gui = undefined;
                    eval(this.responseText);
                    request.onreadystatechange = null;
                    callback();
                } else {
                    if (this.status !== 0) {
                        alert("Kunne ikke loade gui script fra server. Status kode: " + this.status);
                    }
                }
            }
        };

        var request = new XMLHttpRequest();
        request.open("GET", settings.UIserverUrl + "/gui.js?&nocache=" + new Date().getTime(), true);
        if (request.overrideMimeType) {
            request.overrideMimeType("text/javascript");
        }
        request.timeout = settings.timeout;
        request.ontimeout = function () {
            festina.gui.initialize(settings.UIserverUrl, settings.logoUrl, true);
            festina.gui.setHeading("Kaldet for at hente gui script timede ud");
            festina.gui.showModal();
        };
        request.onreadystatechange = handleRequest;
        request.send();
    };

    return {
        scrape: scrape,
    };
})();
true;
// # sourceURL=scraping.js
// @ sourceURL=scraping.js
