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
  const promptRef = useRef("aos>")
  const [terminal, setTerminal] = useState(null);
  const [fitAddon, setFitAddon] = useState(null);
  const terminalRef = useRef(null);
  const commandRef = useRef("");
  const spinnerInterval = useRef(null);
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;

  const startSpinner = (term, text) => {
    let terminal = term;
    let t = text? text : " [Signing message and sequencing...]"
    if (spinnerInterval.current) return; // Spinner is already running
    const interval = setInterval(() => {
      const currentFrame = spinnerFrames[spinnerIndex];
      terminal.write('\r' + currentFrame + t);
      spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 80);

    spinnerInterval.current = interval
  };
  const stopSpinner = () => {
    if (spinnerInterval.current) {
      clearInterval(spinnerInterval.current);
      spinnerInterval.current = null
    }
  };

  const prompt = (term) => {
    term.write(promptRef.current)
  }

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
      if (spinnerInterval) clearInterval(spinnerInterval);
    };
  }, []);

  const checkArConnect = (term) => {
    startSpinner(term, " [ Waiting for arConnect]")
    const checkInterval = setInterval(() => {
      if (globalThis.arweaveWallet) {
        clearInterval(checkInterval);
	term.writeln('\n')
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
		prompt(term)
	      })
	    stopSpinner()
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
    if (!terminal || !process) return;
    if (!terminal) return;
    let cmd = commandRef.current;
    if (data === '\r') { // Enter key
      if (process) {
        terminal.write('\r\n');
	commandRef.current = ""
	prompt(terminal)
	startSpinner(terminal)
        evaluate(cmd, process, globalThis.arweaveWallet)
          .then((ret) => {
	    stopSpinner()
            if (ret.Error || ret.error) {
	      let error = ret.Error || ret.error;
	      terminal.writeln(`Error: ${error}`);
	      terminal.writeln("\n")
            }
            if (ret.Output?.data?.output) {
	      String(ret.Output.data.output).split("\n").forEach(line => terminal.writeln(line));
	      terminal.writeln("\n")
            }
            if (ret.Output?.prompt) {
	      promptRef.current = ret.Output.prompt;
            }
	    prompt(terminal)
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
