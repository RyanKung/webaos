import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  connect,
  message,
  createDataItemSigner,
  results,
} from "@permaweb/aoconnect";
import { register, evaluate } from "./services.js";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { FitAddon } from "xterm-addon-fit";
import { uniqBy, prop, keys } from "ramda";

const LoadingSpinner = () => (
  <div className="spinner-overlay">
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
  </div>
);

const App = () => {
  const { result, results, spawn, monitor, unmonitor, dryrun } = connect({
    MU_URL: "https://ao-mu-1.onrender.com",
  });
  globalThis.utils = {
    result: result,
    results: results,
    spawn: spawn,
    dryrun: dryrun,
  };

  const banner = `
          _____                   _______                   _____
         /\\    \\                 /::\\    \\                 /\\    \\
        /::\\    \\               /::::\\    \\               /::\\    \\
       /::::\\    \\             /::::::\\    \\             /::::\\    \\
      /::::::\\    \\           /::::::::\\    \\           /::::::\\    \\
     /:::/\\:::\\    \\         /:::/~~\\:::\\    \\         /:::/\\:::\\    \\
    /:::/__\\:::\\    \\       /:::/    \\:::\\    \\       /:::/__\\:::\\    \\
   /::::\\   \\:::\\    \\     /:::/    / \\:::\\    \\      \\:::\\   \\:::\\    \\
  /::::::\\   \\:::\\    \\   /:::/____/   \\:::\\____\\   ___\\:::\\   \\:::\\    \\
 /:::/\\:::\\   \\:::\\    \\ |:::|    |     |:::|    | /\\   \\:::\\   \\:::\\    \\
/:::/  \\:::\\   \\:::\\____\\|:::|____|     |:::|    |/::\\   \\:::\\   \\:::\\____\\
\\::/    \\:::\\  /:::/    / \\:::\\    \\   /:::/    / \\:::\\   \\:::\\   \\::/    /
 \\/____/ \\:::\\/:::/    /   \\:::\\    \\ /:::/    /   \\:::\\   \\:::\\   \\/____/
          \\::::::/    /     \\:::\\    /:::/    /     \\:::\\   \\:::\\    \\
           \\::::/    /       \\:::\\__/:::/    /       \\:::\\   \\:::\\____\\
           /:::/    /         \\::::::::/    /         \\:::\\  /:::/    /
          /:::/    /           \\::::::/    /           \\:::\\/:::/    /
         /:::/    /             \\::::/    /             \\::::::/    /
        /:::/    /               \\::/____/               \\::::/    /
        \\::/    /                 ~~                      \\::/    /
         \\/____/                                           \\/____/
    `;

  const welcome = "Welcome to the ao Operating System.";
  const pid = "X22acRgedZXh-G0RnaJSjEIApyAzImmy3jDGiu0Lppo";
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [process, setProcess] = useState(null);
  const [isArConnectInstalled, setIsArConnectInstalled] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([banner, welcome]);
  const promptRef = useRef("aos>");
  const [terminal, setTerminal] = useState(null);
  const [fitAddon, setFitAddon] = useState(null);
  const terminalRef = useRef(null);
  const commandRef = useRef("");
  const spinnerInterval = useRef(null);
  const resultCheckerInterval = useRef(null);
  const alerts = useRef({});
  const cursor = useRef(null);
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [typing, setTyping] = useState(false);

  const colors = {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    reset: "\x1b[0m",
  };

  let spinnerIndex = 0;

  function color(color, text) {
    const colorCode = colors[color.toLowerCase()] || colors.reset;
    return `${colorCode}${text}${colors.reset}`;
  }

  const startSpinner = (term, text) => {
    let terminal = term;
    let t = text ? text : " [Signing message and sequencing...]";
    const interval = setInterval(() => {
      const currentFrame = spinnerFrames[spinnerIndex];
      terminal.write("\r" + color("yellow", currentFrame + t));
      spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 80);

    spinnerInterval.current = interval;
  };

  const stopSpinner = () => {
    if (spinnerInterval.current) {
      clearInterval(spinnerInterval.current);
      spinnerInterval.current = null;
    }
  };

  const checkResult = (pid, alerts, cursor) => {
    try {
      let count = null;
      let params = {};
      if (cursor.current) {
        params = {
          process: pid,
          limit: 1000,
          sort: "DESC",
          from: cursor.current,
        };
      } else {
        params = { process: pid, limit: 1, sort: "DESC" };
      }
      results(params)
        .then((ret) => {
          let edges = uniqBy(prop("cursor"))(
            ret.edges.filter(function (e) {
              if (e.node?.Output?.print === true) {
                return true;
              }
              if (e.cursor === cursor.current) {
                return false;
              }
              return false;
            }),
          );
          if (edges.length > 0) {
            edges.map((e) => {
              if (!alerts.current[e.cursor]) {
                alerts.current[e.cursor] = e.node?.Output;
              }
            });
          }
          count = edges.length;
          if (ret.edges.length > 0) {
            cursor.current = ret.edges[ret.edges.length - 1].cursor;
          }
        })
        .catch((error) => {
          console.error("error on fetching results", error);
          error.errors.forEach((err, index) => {
            console.log(`Error ${index + 1}:`);
            console.log(`Path: ${err.path.join(" -> ")}`);
            console.log(`Message: ${err.message}`);
          });
        });

      // --- peek on previous line and if delete line if last prompt.
      // --- key event can detect
      // count !== null &&
    } catch (e) {
      console.error(e);
    }
  };

  const printResult = (term, alerts) => {
    keys(alerts.current).map((k) => {
      if (alerts.current[k].print) {
        alerts.current[k].print = false;
        if (alerts.current[k].data) {
          term.write("\u001b[2K");
          term.writeln("\u001b[0G" + alerts.current[k].data);
          prompt(term);
        }
      }
    });
  };

  const startCheckResult = (term, process) => {
    if (resultCheckerInterval.current) return; // result checker is already running
    const interval = setInterval(() => {
      if (!typing) {
        checkResult(process, alerts, cursor);
        printResult(term, alerts);
      }
    }, 2000);
    spinnerInterval.current = interval;
  };

  const stopCheckResult = () => {
    if (resultCheckerInterval.current) {
      clearInterval(resultCheckerInterval.current);
      resultCheckerInterval.current = null;
    }
  };

  const prompt = (term) => {
    term.write(color("red", promptRef.current));
  };

  useEffect(() => {
    const newTerminal = new Terminal({
      theme: {
        background: "rgba(33, 64, 46, 0.7)",
        rows: 20,
        cols: 70,
      },
    });
    const newFitAddon = new FitAddon();
    newTerminal.loadAddon(newFitAddon);
    newTerminal.open(terminalRef.current);
    newFitAddon.fit();
    banner
      .split("\n")
      .forEach((line) =>
        newTerminal.writeln("\x1b[1m" + color("magenta", line)),
      );
    newTerminal.writeln("Welcome to the ao Operating System.");
    setTerminal(newTerminal);
    setFitAddon(newFitAddon);
    checkArConnect(newTerminal);

    return () => {
      newTerminal.dispose();
      if (spinnerInterval) clearInterval(spinnerInterval);
    };
  }, []);

  const checkArConnect = (term) => {
    startSpinner(term, " [ Waiting for arConnect]");
    const checkInterval = setInterval(() => {
      if (globalThis.arweaveWallet) {
        clearInterval(checkInterval);
        term.writeln("\n");
        term.writeln("ArConnect detected.");
        window.arweaveWallet
          .connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"])
          .then(() => window.arweaveWallet.getActiveAddress())
          .then((address) => {
            setWalletAddress(address);
            term.writeln(`Wallet Address: ${color("red", address)}`);
            let ret = register(globalThis.arweaveWallet, address);
            return ret;
          })
          .then((pid) => {
            pid
              .toPromise()
              .then((p) => {
                setProcess(p);
                term.writeln(`Your Process Id: ${color("red", p)}`);
                prompt(term);
              })
              .catch((error) => {
                console.log("failed to get process", error);
              });

            stopSpinner();
          })
          .catch((error) => {
            term.writeln(`Error connecting to ArConnect: ${error.message}`);
          });
      }
    }, 1000);
  };

  useEffect(() => {
    if (!terminal || !process) return;
    const onDataHandler = (data) => handleInput(data);
    terminal.onData(onDataHandler);
    return () => terminal.off("data", onDataHandler);
  }, [terminal, process]);

  useEffect(() => {
    if (!terminal || !process) return;
    startCheckResult(terminal, process);
  }, [terminal, process]);

  useEffect(() => {
    if (typing) {
      setTimeout(() => {
        setTyping(false);
      }, 60000);
    }
  }, [typing]);

  const handleInput = useCallback(
    (data) => {
      setTyping(true);
      if (!terminal || !process) return;
      if (!terminal) return;
      let cmd = commandRef.current;
      if (data === "\r") {
        // Enter key
        if (process) {
          terminal.write("\r\n");
          commandRef.current = "";
          prompt(terminal);
          startSpinner(terminal);
          evaluate(cmd, process, globalThis.arweaveWallet)
            .then((ret) => {
              stopSpinner();
              terminal.writeln("\n");
              if (ret.Error || ret.error) {
                let error = ret.Error || ret.error;
                terminal.writeln(`Error: ${error}`);
                terminal.writeln("\n");
              }
              if (ret.Output?.data?.output) {
                String(ret.Output.data.output)
                  .split("\n")
                  .forEach((line) => terminal.writeln(line));
                terminal.writeln("\n");
              }
              if (ret.Output?.prompt) {
                promptRef.current = ret.Output.prompt;
              }
              prompt(terminal);
            })
            .catch((error) => {
              terminal.writeln(`Command error: ${error.message}`);
            });
        }
      } else if (data === "\x7F") {
        if (cmd.length > 0) {
          terminal.write("\b \b"); // Move cursor back, erase character, move cursor back again
          cmd = cmd.slice(0, -1); // Remove last character from command buffer
          commandRef.current = cmd;
        }
      } else {
        cmd += data;
        commandRef.current = cmd;
        terminal.write(data);
      }
    },
    [terminal, process],
  );

  return (
    <div className="term">
      <div className="crt" ref={terminalRef}></div>
    </div>
  );
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
