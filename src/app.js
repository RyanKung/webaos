import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import { connect, message, createDataItemSigner } from "@permaweb/aoconnect";
import { register, evaluate } from "./services.js";
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';

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
  const [prompt, setPrompt] = useState("aos>");
  const [terminal, setTerminal] = useState(null);
  const [fitAddon, setFitAddon] = useState(null);
  const terminalRef = useRef(null);
  const commandRef = useRef("");

  useEffect(() => {
    const newTerminal = new Terminal();
    const newFitAddon = new FitAddon();
    newTerminal.loadAddon(newFitAddon);
    newTerminal.open(terminalRef.current);
    newFitAddon.fit();
    banner.split("\n").forEach(line => newTerminal.writeln(line));
    newTerminal.writeln("Welcome to the ao Operating System.");
    setTerminal(newTerminal);
    setFitAddon(newFitAddon);
    checkArConnect(newTerminal);

    return () => {
      newTerminal.dispose();
    };
  }, []);

  const checkArConnect = (term) => {
    const checkInterval = setInterval(() => {
      if (globalThis.arweaveWallet) {
        clearInterval(checkInterval);
        term.writeln('ArConnect detected.');
        window.arweaveWallet
          .connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION'])
          .then(() => window.arweaveWallet.getActiveAddress())
          .then((address) => {
            setWalletAddress(address);
            term.writeln(`Wallet Address: ${address}`);
            return register(globalThis.arweaveWallet, address);
          })
          .then((pid) => {
	    pid
	      .toPromise()
	      .then((p) => {
		setProcess(p);
		term.writeln(`Your Process Id: ${p}`);
	      })
          })
          .catch((error) => {
            term.writeln(`Error connecting to ArConnect: ${error.message}`);
          });
      }
    }, 1000);
  };

  useEffect(() => {
    if (!terminal || !process) return;
    const onDataHandler = data => handleInput(data);
    terminal.onData(onDataHandler);

    return () => terminal.off('data', onDataHandler);
  }, [terminal, process]);

  const handleInput = useCallback((data) => {
    console.log({data: data})
    if (!terminal || !process) return;
    if (!terminal) return;
    let cmd = commandRef.current;
    console.log({data: data, command: cmd})
    if (data === '\r') { // Enter key
      //	terminal.prompt();
      console.log(1)
      if (process) {
	console.log(data, cmd)
        terminal.write('\r\n');
	commandRef.current = ""
        evaluate(cmd, process, globalThis.arweaveWallet)
          .then((ret) => {
	    console.log(ret)
            if (ret.Error || ret.error) {
	      let error = ret.Error || ret.error;
	      terminal.writeln(`Error: ${error}`);
            }
            if (ret.Output?.data?.output) {
	      String(ret.Output.data.output).split("\n").forEach(line => terminal.writeln(line));
            }
            if (ret.Output?.prompt) {
	      terminal.write(ret.Output.prompt);
            }
          })
          .catch((error) => {
            terminal.writeln(`Command error: ${error.message}`);
          });
      }
    } else if (data === '\x7F') {
      if (cmd.length > 0) {
        terminal.write('\b \b'); // Move cursor back, erase character, move cursor back again
        cmd = cmd.slice(0, -1); // Remove last character from command buffer
	commandRef.current = cmd
      }
    } else {
      console.log(2)
      cmd += data
      commandRef.current = cmd
      terminal.write(data);
    }
  }, [terminal, process]);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
