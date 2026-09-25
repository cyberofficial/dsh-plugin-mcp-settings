window.__ModuleLoader__.load({
	id: "dsh-plugin-mcp-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var css = ".HpKL7W_section {\n  max-width: 760px;\n  color: var(--dsw-alias-label-primary);\n  flex-direction: column;\n  gap: 12px;\n  display: flex;\n}\n\n.HpKL7W_header {\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 16px;\n  display: flex;\n}\n\n.HpKL7W_headerAction {\n  white-space: nowrap;\n  flex: none;\n}\n\n.HpKL7W_headerText {\n  flex-direction: column;\n  gap: 4px;\n  min-width: 0;\n  display: flex;\n}\n\n.HpKL7W_heading {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n}\n\n.HpKL7W_intro {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 0;\n  font-size: 13px;\n}\n\n.HpKL7W_hint {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 0;\n  font-size: 12px;\n}\n\n.HpKL7W_notice {\n  color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary));\n  margin: 0;\n  font-size: 12px;\n}\n\n.HpKL7W_failure {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  display: flex;\n}\n\n.HpKL7W_failure span {\n  overflow-wrap: anywhere;\n  flex: 1;\n  min-width: 0;\n}\n\n.HpKL7W_empty {\n  text-align: center;\n  border: 1px dashed var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  gap: 6px;\n  padding: 40px 24px;\n  font-size: 13px;\n  display: flex;\n}\n\n.HpKL7W_cards {\n  flex-direction: column;\n  gap: 8px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n}\n\n.HpKL7W_card {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  border-radius: 10px;\n}\n\n.HpKL7W_card[data-phase=\"failed\"] {\n  border-color: var(--dsw-alias-border-l3);\n}\n\n.HpKL7W_cardMain {\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px 16px;\n  padding: 10px 14px;\n  display: flex;\n}\n\n.HpKL7W_cardText {\n  flex-direction: column;\n  flex: 240px;\n  gap: 2px;\n  min-width: 0;\n  display: flex;\n}\n\n.HpKL7W_cardTitle {\n  overflow-wrap: break-word;\n  word-break: normal;\n  font-size: 14px;\n  font-weight: 500;\n}\n\n.HpKL7W_cardMeta {\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n  display: flex;\n}\n\n.HpKL7W_cardModule {\n  color: var(--dsw-alias-label-tertiary);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 100%;\n  font-size: 11px;\n  overflow: hidden;\n}\n\n.HpKL7W_cardStatus {\n  flex: none;\n  align-items: center;\n  gap: 8px;\n  margin-left: auto;\n  display: flex;\n}\n\n.HpKL7W_phase {\n  display: inline-flex;\n}\n\n.HpKL7W_phaseLabel {\n  color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary));\n  white-space: nowrap;\n  font-size: 12px;\n}\n\n.HpKL7W_cardControls {\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  margin-left: auto;\n  display: flex;\n}\n\n.HpKL7W_dialog {\n  width: min(560px, 100%);\n}\n\n.HpKL7W_dialogBody {\n  flex-direction: column;\n  gap: 12px;\n  max-height: min(60vh, 520px);\n  padding-right: 2px;\n  display: flex;\n  overflow-y: auto;\n}\n\n.HpKL7W_dialogText {\n  overflow-wrap: anywhere;\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.HpKL7W_dialogFailure {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-error);\n  overflow-wrap: anywhere;\n  border-radius: 8px;\n  margin: 0;\n  padding: 8px 10px;\n  font-size: 12px;\n}\n\n.HpKL7W_dialogNotice {\n  color: var(--dsw-alias-label-tertiary);\n  align-items: center;\n  gap: 6px;\n  margin: 0;\n  font-size: 12px;\n  display: flex;\n}\n\n.HpKL7W_field {\n  flex-direction: column;\n  gap: 4px;\n  display: flex;\n}\n\n.HpKL7W_fieldLabel {\n  color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary));\n  font-size: 12px;\n  font-weight: 500;\n}\n\n.HpKL7W_fieldHint {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 1.45;\n}\n\n.HpKL7W_fieldError {\n  color: var(--dsw-alias-label-error);\n  font-size: 11px;\n}\n\n.HpKL7W_textarea {\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  width: 100%;\n  color: var(--dsw-alias-label-primary);\n  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);\n  resize: vertical;\n  border-radius: 8px;\n  padding: 8px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n.HpKL7W_textarea:focus-visible {\n  border-color: var(--dsw-alias-border-l3);\n  outline: none;\n}\n\n.HpKL7W_checkboxRow {\n  padding-top: 2px;\n}\n\n@media (width <= 760px) {\n  .HpKL7W_header {\n    flex-direction: column;\n    align-items: stretch;\n  }\n\n  .HpKL7W_headerAction {\n    align-self: flex-start;\n  }\n\n  .HpKL7W_cardStatus, .HpKL7W_cardControls {\n    margin-left: 0;\n  }\n}\n";
		var tagId = "dsh-plugin-mcp-settings/client";
		if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
			var tag = document.createElement('style');
			tag.dataset.plugin = "dsh-plugin-mcp-settings";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region shared/spec.ts
		/**
		* Wire contract shared by the host half and the browser half of the MCP
		* Servers section.
		*
		* The Add dialog collects one flat *draft* (every field a string, exactly as
		* typed); this module validates that draft, normalizes it into the config
		* `@deepseek-ai/dsh-mcp-client` accepts, and derives the Loader row id. Both
		* halves call {@link validateDraft}, so the browser refuses a bad form before
		* sending it and the host still refuses anything that arrives another way.
		*
		* @module dsh-plugin-mcp-settings/shared/spec
		*/
		/** Exact fetch route the host half registers on the shared `/api` channel. */
		const SERVERS_PATH = "/api/plugins/mcp-settings/servers";
		/** Loader module every row this panel writes names. */
		const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
		/** `serverName` budget `@deepseek-ai/dsh-mcp-client` itself enforces. */
		const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
		/** Environment variable names `mcp-client` configs may carry. */
		const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
		/** HTTP header field names (RFC 7230 tokens). */
		const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
		/** Characters no stored scalar may contain: YAML indentation and diagnostics stay readable. */
		const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
		/** Read a draft field as a trimmed string (empty for anything not a string). */
		function field(draft, name) {
			const value = draft[name];
			return typeof value === "string" ? value.trim() : "";
		}
		/** Split a textarea value into trimmed, non-blank, non-comment lines. */
		function textLines(text) {
			const lines = [];
			for (const [index, raw] of text.split(/\r?\n/).entries()) {
				const value = raw.trim();
				if (value === "" || value.startsWith("#")) continue;
				lines.push({
					line: index + 1,
					text: value
				});
			}
			return lines;
		}
		/**
		* Parse `KEY=VALUE` lines (environment) or `Name: value` lines (headers).
		* @param text - the textarea value.
		* @param separator - the character splitting each line.
		* @param kind - which pattern the key must satisfy.
		* @returns the parsed pairs and the lines that did not fit.
		*/
		function parseKeyValueLines(text, separator, kind) {
			const pattern = kind === "env" ? ENV_KEY_PATTERN : HEADER_NAME_PATTERN;
			const reason = kind === "env" ? "env-line" : "header-line";
			const seen = /* @__PURE__ */ new Set();
			const entries = [];
			const problems = [];
			for (const { line, text: value } of textLines(text)) {
				const at = value.indexOf(separator);
				const key = at === -1 ? "" : value.slice(0, at).trim();
				const rest = at === -1 ? "" : value.slice(at + 1).trim();
				if (key === "" || !pattern.test(key) || seen.has(key)) {
					problems.push({
						field: kind === "env" ? "env" : "headers",
						reason,
						line
					});
					continue;
				}
				if (CONTROL_CHARACTERS.test(rest)) {
					problems.push({
						field: kind === "env" ? "env" : "headers",
						reason: "control",
						line
					});
					continue;
				}
				seen.add(key);
				entries.push({
					key,
					value: rest,
					line
				});
			}
			return {
				entries,
				problems
			};
		}
		/** Parse the one-argument-per-line textarea. */
		function parseArguments(text) {
			const args = [];
			const problems = [];
			for (const { line, text: value } of textLines(text)) {
				if (CONTROL_CHARACTERS.test(value)) {
					problems.push({
						field: "args",
						reason: "control",
						line
					});
					continue;
				}
				args.push(value);
			}
			return {
				args,
				problems
			};
		}
		/** Read the optional per-call timeout. */
		function parseTimeout(value) {
			if (value === "") return { problems: [] };
			if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647) return { problems: [{
				field: "toolCallTimeoutMs",
				reason: "timeout"
			}] };
			return {
				timeout: Number(value),
				problems: []
			};
		}
		/**
		* Validate one Add-dialog draft and normalize it into a `mcp-client` config.
		* @param input - the untrusted draft (form state on the browser, JSON body on the host).
		* @returns the normalized spec, or every problem the draft has.
		*/
		function validateDraft(input) {
			const draft = typeof input === "object" && input !== null ? input : {};
			const problems = [];
			const serverName = field(draft, "serverName");
			if (serverName === "") problems.push({
				field: "serverName",
				reason: "required"
			});
			else if (!SERVER_NAME_PATTERN.test(serverName)) problems.push({
				field: "serverName",
				reason: "pattern"
			});
			const transport = draft.transport === "streamable-http" ? "streamable-http" : draft.transport === "stdio" ? "stdio" : void 0;
			if (transport === void 0) problems.push({
				field: "transport",
				reason: "invalid"
			});
			const timeout = parseTimeout(field(draft, "toolCallTimeoutMs"));
			problems.push(...timeout.problems);
			const failOnStartupError = draft.failOnStartupError === true;
			if (transport === "stdio") {
				const command = field(draft, "command");
				if (command === "") problems.push({
					field: "command",
					reason: "required"
				});
				else if (CONTROL_CHARACTERS.test(command)) problems.push({
					field: "command",
					reason: "control"
				});
				const cwd = field(draft, "cwd");
				if (CONTROL_CHARACTERS.test(cwd)) problems.push({
					field: "cwd",
					reason: "control"
				});
				const args = parseArguments(typeof draft.argsText === "string" ? draft.argsText : "");
				problems.push(...args.problems);
				const env = parseKeyValueLines(typeof draft.envText === "string" ? draft.envText : "", "=", "env");
				problems.push(...env.problems);
				if (problems.length > 0) return {
					ok: false,
					problems
				};
				return {
					ok: true,
					spec: {
						transport: "stdio",
						serverName,
						command,
						args: args.args,
						env: Object.fromEntries(env.entries.map((entry) => [entry.key, entry.value])),
						cwd,
						...timeout.timeout === void 0 ? {} : { toolCallTimeoutMs: timeout.timeout },
						failOnStartupError
					}
				};
			}
			if (transport === "streamable-http") {
				const url = field(draft, "url");
				if (url === "") problems.push({
					field: "url",
					reason: "required"
				});
				else if (CONTROL_CHARACTERS.test(url) || !isHttpUrl(url)) problems.push({
					field: "url",
					reason: "invalid"
				});
				const headers = parseKeyValueLines(typeof draft.headersText === "string" ? draft.headersText : "", ":", "header");
				problems.push(...headers.problems);
				if (problems.length > 0) return {
					ok: false,
					problems
				};
				return {
					ok: true,
					spec: {
						transport: "streamable-http",
						serverName,
						url,
						headers: Object.fromEntries(headers.entries.map((entry) => [entry.key, entry.value])),
						...timeout.timeout === void 0 ? {} : { toolCallTimeoutMs: timeout.timeout },
						failOnStartupError
					}
				};
			}
			return {
				ok: false,
				problems
			};
		}
		/** Whether a value parses as an absolute http(s) URL. */
		function isHttpUrl(value) {
			let parsed;
			try {
				parsed = new URL(value);
			} catch {
				return false;
			}
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		}
		/** An empty draft, for the Add dialog's initial state. */
		function emptyDraft() {
			return {
				serverName: "",
				transport: "stdio",
				command: "",
				argsText: "",
				envText: "",
				cwd: "",
				url: "",
				headersText: "",
				toolCallTimeoutMs: "",
				failOnStartupError: false
			};
		}
		//#endregion
		//#region client/messages.ts
		/** Why the edit form refuses to save one row. */
		function blockMessage(block, t) {
			return block === "js-expression" ? t("blockedJs") : t("blockedConfig");
		}
		/** Message for one validation problem, including the offending line when known. */
		function problemMessage(problem, t) {
			const line = problem.line === void 0 ? "" : ` (line ${String(problem.line)})`;
			switch (problem.field) {
				case "serverName": return problem.reason === "required" ? t("problemNameRequired") : t("problemNamePattern");
				case "transport": return t("problemTransport");
				case "command": return problem.reason === "required" ? t("problemCommandRequired") : t("problemControl");
				case "url": return problem.reason === "required" ? t("problemUrlRequired") : t("problemUrlInvalid");
				case "toolCallTimeoutMs": return t("problemTimeout");
				case "env": return `${t("problemEnvLine")}${line}`;
				case "headers": return `${t("problemHeaderLine")}${line}`;
				case "args":
				case "cwd": return `${t("problemControl")}${line}`;
			}
		}
		/** The first message per field, for inline form errors. */
		function fieldMessages(problems, t) {
			const messages = {};
			for (const problem of problems) {
				if (messages[problem.field] !== void 0) continue;
				messages[problem.field] = problemMessage(problem, t);
			}
			return messages;
		}
		/** One sentence for a host refusal. */
		function serverErrorMessage(error, t) {
			switch (error.code) {
				case "duplicate-id": return t("errorDuplicateId", { id: error.detail ?? "" });
				case "duplicate-name": return t("errorDuplicateName", { name: error.detail ?? "" });
				case "not-found": return t("errorNotFound", { id: error.detail ?? "" });
				case "ambiguous": return t("errorAmbiguous", { id: error.detail ?? "" });
				case "unsupported": return t("errorUnsupported", { detail: error.detail ?? "" });
				case "invalid-spec": return error.problems === void 0 || error.problems.length === 0 ? t("errorInvalidSpec") : error.problems.map((problem) => problemMessage(problem, t)).join(" ");
				case "bad-request": return t("errorBadRequest");
				case "no-profile": return t("errorNoProfile");
				case "io-error": return t("errorIoError", { detail: error.detail ?? "" });
			}
		}
		//#endregion
		//#region client/McpServersSection.module.css
		var McpServersSection_module_default = {
			"card": "HpKL7W_card",
			"cardControls": "HpKL7W_cardControls",
			"cardMain": "HpKL7W_cardMain",
			"cardMeta": "HpKL7W_cardMeta",
			"cardModule": "HpKL7W_cardModule",
			"cards": "HpKL7W_cards",
			"cardStatus": "HpKL7W_cardStatus",
			"cardText": "HpKL7W_cardText",
			"cardTitle": "HpKL7W_cardTitle",
			"checkboxRow": "HpKL7W_checkboxRow",
			"dialog": "HpKL7W_dialog",
			"dialogBody": "HpKL7W_dialogBody",
			"dialogFailure": "HpKL7W_dialogFailure",
			"dialogNotice": "HpKL7W_dialogNotice",
			"dialogText": "HpKL7W_dialogText",
			"empty": "HpKL7W_empty",
			"failure": "HpKL7W_failure",
			"field": "HpKL7W_field",
			"fieldError": "HpKL7W_fieldError",
			"fieldHint": "HpKL7W_fieldHint",
			"fieldLabel": "HpKL7W_fieldLabel",
			"header": "HpKL7W_header",
			"headerAction": "HpKL7W_headerAction",
			"headerText": "HpKL7W_headerText",
			"heading": "HpKL7W_heading",
			"hint": "HpKL7W_hint",
			"intro": "HpKL7W_intro",
			"notice": "HpKL7W_notice",
			"phase": "HpKL7W_phase",
			"phaseLabel": "HpKL7W_phaseLabel",
			"section": "HpKL7W_section",
			"textarea": "HpKL7W_textarea"
		};
		//#endregion
		//#region client/ServerDialog.tsx
		/**
		* The server dialog, in both of its modes.
		*
		* Add starts from an empty draft; Edit starts from the draft the host read out
		* of the running Loader entry, and refuses to save when that read was blocked
		* (`!!js` row text, or a config this form cannot round-trip). Either way the
		* draft is one flat object validated by the shared spec module before anything
		* leaves the browser, and the host validates it again — this form is
		* convenience, never the guarantee.
		*/
		/** Draft keys whose validation problem is reported under another field name. */
		const ERROR_FIELD_OF = {
			argsText: "args",
			envText: "env",
			headersText: "headers"
		};
		/** One labelled form row with its hint and inline error. */
		function Field({ label, hint, error, as = "label", children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(as, {
				className: McpServersSection_module_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: McpServersSection_module_default.fieldLabel,
						children: label
					}),
					children,
					hint === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: McpServersSection_module_default.fieldHint,
						children: hint
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: McpServersSection_module_default.fieldError,
						role: "alert",
						children: error
					})
				]
			});
		}
		/** Render the add/edit server dialog. */
		function ServerDialog({ mode, draft: initial, loading = false, blocked, note, onSubmit, onClose, t }) {
			const [draft, setDraft] = (0, react.useState)(() => initial ?? emptyDraft());
			const [errors, setErrors] = (0, react.useState)({});
			const [failure, setFailure] = (0, react.useState)();
			const [busy, setBusy] = (0, react.useState)(false);
			const [adopted, setAdopted] = (0, react.useState)(initial !== void 0);
			(0, react.useEffect)(() => {
				if (initial === void 0 || adopted) return;
				setDraft(initial);
				setAdopted(true);
			}, [initial, adopted]);
			const locked = busy || loading || blocked !== void 0;
			const update = (patch) => {
				setDraft((current) => ({
					...current,
					...patch
				}));
				setErrors((current) => {
					const next = { ...current };
					for (const key of Object.keys(patch)) delete next[ERROR_FIELD_OF[key] ?? key];
					return next;
				});
				setFailure(void 0);
			};
			const submit = async () => {
				const result = validateDraft(draft);
				if (!result.ok) {
					setErrors(fieldMessages(result.problems, t));
					setFailure(void 0);
					return;
				}
				setErrors({});
				setBusy(true);
				try {
					const refusal = await onSubmit(draft);
					if (refusal === void 0) onClose();
					else setFailure(refusal);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: mode === "add" ? t("addTitle") : t("editTitle"),
				closeLabel: t("close"),
				description: mode === "add" ? t("addIntro") : t("editIntro"),
				className: McpServersSection_module_default.dialog,
				contentClassName: McpServersSection_module_default.dialogBody,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onClose,
					children: t("cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: locked,
					onClick: () => {
						submit();
					},
					children: busy ? mode === "add" ? t("adding") : t("editing") : mode === "add" ? t("save") : t("edit")
				})] }),
				children: [
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: McpServersSection_module_default.dialogNotice,
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
								size: 14,
								"aria-hidden": "true"
							}),
							" ",
							t("loadingConfig")
						]
					}) : null,
					blocked === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.dialogFailure,
						role: "alert",
						children: blocked
					}),
					failure === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.dialogFailure,
						role: "alert",
						children: failure
					}),
					loading ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: t("fieldName"),
							hint: t("fieldNameHint"),
							error: errors["serverName"],
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: draft.serverName,
								placeholder: "github",
								spellCheck: false,
								autoComplete: "off",
								disabled: blocked !== void 0,
								"data-modal-autofocus": true,
								"aria-invalid": errors["serverName"] !== void 0,
								onChange: (event) => {
									update({ serverName: event.target.value });
								}
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: t("fieldTransport"),
							error: errors["transport"],
							as: "div",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
								id: "mcp-server-transport",
								value: draft.transport,
								label: t("fieldTransport"),
								disabled: blocked !== void 0,
								options: [{
									value: "stdio",
									label: t("transportStdio")
								}, {
									value: "streamable-http",
									label: t("transportHttp")
								}],
								onChange: (next) => {
									update({ transport: next });
								}
							})
						}),
						draft.transport === "stdio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("fieldCommand"),
								hint: t("fieldCommandHint"),
								error: errors["command"],
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									value: draft.command,
									placeholder: "npx",
									spellCheck: false,
									autoComplete: "off",
									disabled: blocked !== void 0,
									"aria-invalid": errors["command"] !== void 0,
									onChange: (event) => {
										update({ command: event.target.value });
									}
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("fieldArgs"),
								error: errors["args"],
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: McpServersSection_module_default.textarea,
									value: draft.argsText,
									rows: 3,
									spellCheck: false,
									disabled: blocked !== void 0,
									placeholder: "-y\n@modelcontextprotocol/server-github",
									onChange: (event) => {
										update({ argsText: event.target.value });
									}
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("fieldEnv"),
								hint: t("fieldEnvHint"),
								error: errors["env"],
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: McpServersSection_module_default.textarea,
									value: draft.envText,
									rows: 3,
									spellCheck: false,
									disabled: blocked !== void 0,
									placeholder: "GITHUB_TOKEN=ghp_...",
									onChange: (event) => {
										update({ envText: event.target.value });
									}
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("fieldCwd"),
								error: errors["cwd"],
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									value: draft.cwd,
									spellCheck: false,
									autoComplete: "off",
									disabled: blocked !== void 0,
									"aria-invalid": errors["cwd"] !== void 0,
									onChange: (event) => {
										update({ cwd: event.target.value });
									}
								})
							})
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: t("fieldUrl"),
							error: errors["url"],
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: draft.url,
								placeholder: "https://example.com/mcp",
								spellCheck: false,
								autoComplete: "off",
								disabled: blocked !== void 0,
								"aria-invalid": errors["url"] !== void 0,
								onChange: (event) => {
									update({ url: event.target.value });
								}
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: t("fieldHeaders"),
							hint: t("fieldHeadersHint"),
							error: errors["headers"],
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: McpServersSection_module_default.textarea,
								value: draft.headersText,
								rows: 3,
								spellCheck: false,
								disabled: blocked !== void 0,
								placeholder: "Authorization: Bearer ...",
								onChange: (event) => {
									update({ headersText: event.target.value });
								}
							})
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: McpServersSection_module_default.fieldHint,
							children: t("fieldSecretNotice")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: t("fieldTimeout"),
							hint: t("fieldTimeoutHint"),
							error: errors["toolCallTimeoutMs"],
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: draft.toolCallTimeoutMs,
								inputMode: "numeric",
								placeholder: "60000",
								spellCheck: false,
								autoComplete: "off",
								disabled: blocked !== void 0,
								"aria-invalid": errors["toolCallTimeoutMs"] !== void 0,
								onChange: (event) => {
									update({ toolCallTimeoutMs: event.target.value });
								}
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: McpServersSection_module_default.checkboxRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
								checked: draft.failOnStartupError,
								label: t("fieldFailOnStartup"),
								disabled: blocked !== void 0,
								onChange: (next) => {
									update({ failOnStartupError: next });
								}
							})
						}),
						note === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: McpServersSection_module_default.fieldHint,
							children: note
						})
					] })
				]
			});
		}
		//#endregion
		//#region client/McpServersSection.tsx
		/**
		* MCP Servers settings section.
		*
		* One card per `@deepseek-ai/dsh-mcp-client` Loader entry, with a live phase
		* dot, an enable/disable switch, and a retry action that restarts the entry
		* (disable, then enable), which re-establishes the MCP connection. The list and
		* those two actions come from the mounted `pluginManager` Remote; adding,
		* editing, and removing a server change the patch file itself and go through
		* this plugin's own host route (`manage`), because no Remote writes Loader rows.
		*
		* A patch write is applied by the harness's own patch watcher, so an added,
		* edited, or removed row appears a moment later rather than synchronously. The
		* section therefore re-reads the list on a slow tick while any row is still
		* settling, and for a short window after a mutation.
		*/
		const PHASE_DOT = {
			pending: "idle",
			loading: "ongoing",
			active: "success",
			failed: "error",
			unloading: "ongoing"
		};
		const PHASE_KEY = {
			pending: "statusPending",
			loading: "statusLoading",
			active: "statusActive",
			failed: "statusFailed",
			unloading: "statusUnloading"
		};
		/** How often a settling section re-reads the live row list. */
		const POLL_MS = 1500;
		/** How long after a mutation the section keeps polling, even with nothing settling. */
		const SETTLE_MS = 2e4;
		/** Exact diagnostic of anything thrown. */
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		function rowView(entry, t) {
			if (!entry.enabled) return {
				entry,
				dot: "idle",
				label: t("statusOff"),
				tone: "neutral",
				tag: t("disabledTag")
			};
			const phase = entry.fiberPhase;
			return {
				entry,
				dot: phase === null ? "idle" : PHASE_DOT[phase],
				label: phase === null ? t("statusPending") : t(PHASE_KEY[phase]),
				tone: phase === "failed" ? "danger" : "success",
				tag: t("enabledTag")
			};
		}
		/** Display name for one server row: the patch entry id, without its `include:` marker. */
		function displayName(entry) {
			return entry.entryId.replace(/^include:/, "");
		}
		/** Whether a row is mid-flight in the Loader. */
		function settling(entry) {
			return entry.fiberPhase === "pending" || entry.fiberPhase === "loading" || entry.fiberPhase === "unloading";
		}
		/**
		* Why a locked row stays locked, in words.
		*
		* `unaddressable` covers two very different situations: a row a bundle patch or
		* overlay declares (which still carries a patch id), and an entry no layer
		* declares any more — what a server leaves behind when it failed and its row was
		* removed. The patch snapshot tells them apart: the leftovers are the ids it
		* does not list.
		*
		* @param entry - the locked row.
		* @param declared - row ids the patch files declare.
		* @param t - section translator.
		* @returns the sentence shown under the card.
		*/
		function lockHint(entry, declared, t) {
			if (entry.readOnlyReason === "management-required") return t("lockedHint");
			const id = entry.patchId ?? entry.entryId.replace(/^include:/, "");
			return declared.has(id) ? t("outsideHint") : t("staleHint");
		}
		/** Render the MCP Servers section. */
		function McpServersSection({ t, list, setEnabled, manage }) {
			const [view, setView] = (0, react.useState)({ status: "loading" });
			const [patch, setPatch] = (0, react.useState)();
			const [patchError, setPatchError] = (0, react.useState)();
			const [busyIds, setBusyIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [actionError, setActionError] = (0, react.useState)();
			const [notice, setNotice] = (0, react.useState)();
			const [dialog, setDialog] = (0, react.useState)({ kind: "closed" });
			const [removeTarget, setRemoveTarget] = (0, react.useState)();
			const [removeError, setRemoveError] = (0, react.useState)();
			const [removing, setRemoving] = (0, react.useState)(false);
			const [mutatedAt, setMutatedAt] = (0, react.useState)(0);
			const reload = (0, react.useCallback)(() => {
				list().then((snapshot) => {
					setView({
						status: "ready",
						servers: snapshot.filter((row) => row.moduleName === MCP_CLIENT_MODULE)
					});
				}, (error) => {
					setView({
						status: "error",
						message: messageOf(error)
					});
				});
			}, [list]);
			const loadPatch = (0, react.useCallback)(() => {
				manage.snapshot().then((result) => {
					if (result.ok) {
						setPatch(result.value);
						setPatchError(void 0);
					} else {
						setPatch(void 0);
						setPatchError(serverErrorMessage(result.error, t));
					}
				}, (error) => {
					setPatch(void 0);
					setPatchError(messageOf(error));
				});
			}, [manage, t]);
			(0, react.useEffect)(() => {
				let current = true;
				setView({ status: "loading" });
				list().then((snapshot) => {
					if (!current) return;
					setView({
						status: "ready",
						servers: snapshot.filter((row) => row.moduleName === MCP_CLIENT_MODULE)
					});
				}, (error) => {
					if (!current) return;
					setView({
						status: "error",
						message: messageOf(error)
					});
				});
				return () => {
					current = false;
				};
			}, [list]);
			(0, react.useEffect)(() => {
				loadPatch();
			}, [loadPatch]);
			const live = (0, react.useRef)({
				settling: false,
				mutatedAt: 0,
				reload: () => {}
			});
			const settlingNow = view.status === "ready" && view.servers.some(settling);
			(0, react.useEffect)(() => {
				live.current = {
					settling: settlingNow,
					mutatedAt,
					reload
				};
			});
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => {
					const current = live.current;
					if (current.settling || Date.now() - current.mutatedAt < SETTLE_MS) current.reload();
				}, POLL_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, []);
			const reloadAll = (0, react.useCallback)(() => {
				reload();
				loadPatch();
			}, [reload, loadPatch]);
			const run = async (entry, action, busyLabel, done) => {
				setBusyIds((previous) => new Set([...previous, entry.entryId]));
				setActionError(void 0);
				setNotice(busyLabel);
				try {
					await action(entry.entryId);
					setNotice(done);
					setMutatedAt(Date.now());
					reloadAll();
				} catch (error) {
					setActionError(`${t("actionFailed")}: ${messageOf(error)}`);
					setNotice(void 0);
				} finally {
					setBusyIds((previous) => {
						const next = new Set(previous);
						next.delete(entry.entryId);
						return next;
					});
				}
			};
			const toggle = (entry) => run(entry, (id) => setEnabled(id, !entry.enabled), t("toggling"), t("toggled"));
			const retry = (entry) => run(entry, async (id) => {
				await setEnabled(id, false);
				await setEnabled(id, true);
			}, t("retrying"), t("retried"));
			/** Add the dialog's draft; the answer is the refusal text, or undefined when added. */
			const addServer = async (draft) => {
				const result = await manage.add(draft);
				if (!result.ok) return serverErrorMessage(result.error, t);
				setActionError(void 0);
				setNotice(t("added", { name: draft.serverName }));
				setMutatedAt(Date.now());
				reloadAll();
			};
			/** Open the edit form: show it at once, then fill it from the host's answer. */
			const openEdit = async (entry) => {
				const id = entry.patchId;
				if (id === void 0) return;
				setDialog({
					kind: "edit",
					id,
					loading: true
				});
				const result = await manage.inspect(id);
				setDialog((current) => {
					if (current.kind !== "edit" || current.id !== id) return current;
					if (!result.ok) return {
						...current,
						loading: false,
						blocked: serverErrorMessage(result.error, t)
					};
					return {
						...current,
						loading: false,
						draft: result.value.draft,
						...result.value.blocked === void 0 ? {} : { blocked: blockMessage(result.value.blocked, t) },
						...result.value.managed ? {} : { note: t("handWrittenNote") }
					};
				});
			};
			/** Save the edit form's draft back over the row it opened from. */
			const editServer = async (id, draft) => {
				const result = await manage.edit(id, draft);
				if (!result.ok) return serverErrorMessage(result.error, t);
				setDialog({ kind: "closed" });
				setActionError(void 0);
				setNotice(t("edited", { name: draft.serverName }));
				setMutatedAt(Date.now());
				reloadAll();
			};
			const confirmRemove = async (entry) => {
				const id = entry.patchId;
				if (id === void 0) return;
				setRemoving(true);
				setRemoveError(void 0);
				setActionError(void 0);
				try {
					const result = await manage.remove(id);
					if (!result.ok) {
						setRemoveError(serverErrorMessage(result.error, t));
						return;
					}
					setRemoveTarget(void 0);
					setNotice(t("removed", { name: displayName(entry) }));
					setMutatedAt(Date.now());
					reloadAll();
				} finally {
					setRemoving(false);
				}
			};
			/** Patch-file rows this profile declares, keyed for the cards' remove affordance. */
			const patchRows = (0, react.useMemo)(() => new Map((patch?.rows ?? []).map((row) => [row.id, row])), [patch]);
			if (view.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: McpServersSection_module_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: McpServersSection_module_default.heading,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.intro,
						children: t("intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.hint,
						role: "status",
						children: t("loading")
					})
				]
			});
			const header = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: McpServersSection_module_default.header,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: McpServersSection_module_default.headerText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: McpServersSection_module_default.heading,
						children: t("title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.intro,
						children: t("intro")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					className: McpServersSection_module_default.headerAction,
					onClick: () => {
						setDialog({ kind: "add" });
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, {
						size: 14,
						"aria-hidden": "true"
					}), t("add")]
				})]
			});
			if (view.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: McpServersSection_module_default.section,
				children: [header, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: McpServersSection_module_default.failure,
					role: "alert",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }),
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: view.message }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: reload,
							children: t("retry")
						})
					]
				})]
			});
			const servers = view.servers;
			const settled = Date.now() - mutatedAt >= SETTLE_MS;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: McpServersSection_module_default.section,
				children: [
					header,
					actionError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: McpServersSection_module_default.failure,
						role: "alert",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: actionError })
						]
					}) : notice !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.notice,
						role: "status",
						children: notice
					}) : null,
					patchError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: McpServersSection_module_default.hint,
						role: "status",
						children: [
							t("snapshotFailed"),
							" ",
							patchError
						]
					}),
					servers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: McpServersSection_module_default.empty,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("empty") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: McpServersSection_module_default.hint,
							children: t("emptyDesc")
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: McpServersSection_module_default.cards,
						children: servers.map((entry) => {
							const row = rowView(entry, t);
							const busy = busyIds.has(entry.entryId);
							const locked = entry.readOnlyReason !== void 0;
							const patchRow = entry.patchId === void 0 ? void 0 : patchRows.get(entry.patchId);
							const outside = entry.patchId !== void 0 && patch !== void 0 && patchRow === void 0 && settled;
							const manageable = entry.patchId !== void 0 && !outside;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: McpServersSection_module_default.card,
								"data-phase": entry.fiberPhase ?? "off",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: McpServersSection_module_default.cardMain,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: McpServersSection_module_default.cardText,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: McpServersSection_module_default.cardTitle,
													title: displayName(entry),
													children: displayName(entry)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: McpServersSection_module_default.cardMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
														className: McpServersSection_module_default.cardModule,
														title: entry.moduleName,
														children: entry.moduleName
													}), patchRow?.managed === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "quiet",
														children: t("managedTag")
													}) : null]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: McpServersSection_module_default.cardStatus,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: McpServersSection_module_default.phase,
														role: "img",
														"aria-label": row.label,
														title: row.label,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.dot })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: McpServersSection_module_default.phaseLabel,
														children: row.label
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: row.tone,
														children: row.tag
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: McpServersSection_module_default.cardControls,
												children: [
													!locked && entry.enabled && entry.fiberPhase !== "loading" && entry.fiberPhase !== "unloading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														disabled: busy,
														onClick: () => {
															retry(entry);
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineMedium, {
															size: 14,
															"aria-hidden": "true"
														}), busy ? t("retrying") : t("retry")]
													}) : null,
													!locked && manageable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														disabled: busy,
														onClick: () => {
															openEdit(entry);
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {
															size: 14,
															"aria-hidden": "true"
														}), t("edit")]
													}) : null,
													!locked && manageable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														disabled: busy,
														onClick: () => {
															setRemoveError(void 0);
															setRemoveTarget(entry);
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {
															size: 14,
															"aria-hidden": "true"
														}), t("remove")]
													}) : null,
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
														checked: entry.enabled,
														disabled: busy || locked,
														label: `${displayName(entry)}: ${row.tag}`,
														onChange: () => {
															toggle(entry);
														}
													})
												]
											})
										]
									}),
									locked ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: McpServersSection_module_default.hint,
										children: lockHint(entry, patchRows, t)
									}) : null,
									outside ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: McpServersSection_module_default.hint,
										children: t("outsideHint")
									}) : null
								]
							}, entry.entryId);
						})
					}),
					patch === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.hint,
						children: t("patchHint", { path: patch.patchPath })
					}),
					patch?.live === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.hint,
						role: "status",
						children: t("restartHint")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.hint,
						children: t("configHint")
					}),
					dialog.kind === "add" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerDialog, {
						mode: "add",
						t,
						onClose: () => {
							setDialog({ kind: "closed" });
						},
						onSubmit: addServer
					}) : null,
					dialog.kind === "edit" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerDialog, {
						mode: "edit",
						t,
						loading: dialog.loading,
						draft: dialog.draft,
						blocked: dialog.blocked,
						note: dialog.note,
						onClose: () => {
							setDialog({ kind: "closed" });
						},
						onSubmit: (draft) => editServer(dialog.id, draft)
					}) : null,
					removeTarget === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setRemoveTarget(void 0);
						},
						title: t("removeTitle"),
						closeLabel: t("close"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								setRemoveTarget(void 0);
							},
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: removing,
							onClick: () => {
								confirmRemove(removeTarget);
							},
							children: removing ? t("removing") : t("remove")
						})] }),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: McpServersSection_module_default.dialogText,
							children: t("removeConfirm", {
								name: displayName(removeTarget),
								path: patchRows.get(removeTarget.patchId ?? "")?.file === "home" ? patch?.homePatchPath ?? "" : patch?.patchPath ?? ""
							})
						}), removeError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: McpServersSection_module_default.dialogFailure,
							role: "alert",
							children: removeError
						})]
					})
				]
			});
		}
		//#endregion
		//#region client/locales.ts
		const en = {
			nav: "MCP Servers",
			title: "MCP Servers",
			intro: "Model Context Protocol servers connected to this harness. Add or remove a server here; toggle one to enable or disable it; retry restarts its connection.",
			empty: "No MCP servers configured.",
			emptyDesc: "Add one here, or write @deepseek-ai/dsh-mcp-client entries into the profile configuration file.",
			loading: "Loading servers...",
			error: "Failed to load servers",
			retry: "Retry",
			toggling: "Switching...",
			toggled: "Server switched",
			retrying: "Restarting...",
			retried: "Connection restarted",
			actionFailed: "Action failed",
			statusPending: "Pending",
			statusLoading: "Starting",
			statusActive: "Connected",
			statusFailed: "Failed",
			statusUnloading: "Stopping",
			statusOff: "Off",
			enabledTag: "Enabled",
			disabledTag: "Disabled",
			transport: "Transport",
			module: "Module",
			configHint: "Connection settings (command, URL, arguments) are edited in the configuration file.",
			patchHint: "Added servers are written to {path}; the harness reloads them live.",
			restartHint: "This profile does not watch its patch file, so a server added or removed here takes effect after the harness restarts.",
			managedTag: "From this panel",
			byHandTag: "From your patch file",
			outsideHint: "Defined outside your patch files (a bundle patch or --patch overlay) - edit it there.",
			lockedHint: "This row manages the plugin loader itself, so it cannot be changed from here.",
			staleHint: "No patch file declares this entry, so nothing can manage it from here: it is usually what a server leaves behind when it failed and its row was removed. Restarting the harness clears it, or add a server with this name and remove it again.",
			snapshotFailed: "The patch files could not be read, so removing servers is unavailable.",
			add: "Add server",
			addTitle: "Add MCP server",
			addIntro: "Writes one @deepseek-ai/dsh-mcp-client row into your profile patch and mounts it live.",
			adding: "Adding...",
			added: "Server added: {name}",
			addFailed: "The server was not added",
			fieldName: "Name",
			fieldNameHint: "Tool names become mcp__<name>__<tool>. Letters, digits, underscore, or hyphen, up to 32.",
			fieldTransport: "Transport",
			transportStdio: "stdio",
			transportHttp: "HTTP",
			fieldCommand: "Command",
			fieldCommandHint: "Executable that starts the server. Arguments are passed without a shell.",
			fieldArgs: "Arguments (one per line)",
			fieldEnv: "Environment (KEY=VALUE per line)",
			fieldEnvHint: "Blank lines and lines starting with # are ignored. API keys go here, e.g. EXA_API_KEY=...",
			fieldCwd: "Working directory",
			fieldUrl: "URL",
			fieldHeaders: "Headers (Name: value per line)",
			fieldHeadersHint: "Blank lines and lines starting with # are ignored. API keys go here, e.g. x-api-key: YOUR_KEY or Authorization: Bearer YOUR_KEY.",
			fieldSecretNotice: "Headers and environment values are stored in your patch file as plain text.",
			fieldTimeout: "Tool call timeout (ms)",
			fieldTimeoutHint: "Empty uses the mcp-client default of 60000.",
			fieldFailOnStartup: "Fail activation when the first connection fails",
			cancel: "Cancel",
			save: "Add",
			close: "Close",
			edit: "Edit",
			editTitle: "Edit MCP server",
			editIntro: "Saves this server back into your patch and remounts it live.",
			editing: "Saving...",
			edited: "Server updated: {name}",
			editFailed: "The server was not updated",
			loadingConfig: "Loading current settings...",
			handWrittenNote: "This row was written by hand. Saving rewrites its config block and keeps every other line of the file.",
			blockedJs: "This row carries !!js expressions, which a form would replace with their current values. Edit it in your patch file instead.",
			blockedConfig: "The running entry exposes no configuration this form can rewrite. Edit it in your patch file instead.",
			remove: "Remove",
			removeTitle: "Remove MCP server",
			removeConfirm: "Remove {name} from {path}? Its row and its enable/disable override are deleted; every other line of the file is kept.",
			removing: "Removing...",
			removed: "Server removed: {name}",
			removeFailed: "The server was not removed",
			problemNameRequired: "A name is required.",
			problemNamePattern: "Use 1-32 letters, digits, underscores, or hyphens.",
			problemTransport: "Pick a transport.",
			problemCommandRequired: "A command is required for stdio servers.",
			problemUrlRequired: "A URL is required for HTTP servers.",
			problemUrlInvalid: "Enter an http:// or https:// URL.",
			problemControl: "Remove line breaks and control characters.",
			problemTimeout: "Enter a whole number of milliseconds, 1 or more.",
			problemEnvLine: "Every line must look like KEY=VALUE.",
			problemHeaderLine: "Every line must look like Name: value.",
			errorDuplicateId: "A row named {id} already exists in this profile.",
			errorDuplicateName: "The server name {name} is already used by a live server.",
			errorNotFound: "No patch-file row named {id} was found; it may come from a bundle patch.",
			errorUnsupported: "The patch file could not be edited: {detail}",
			errorAmbiguous: "More than one row matches {id}; edit the patch file by hand.",
			errorInvalidSpec: "The server configuration was refused.",
			errorBadRequest: "The host did not understand the request.",
			errorNoProfile: "This harness is not running a dsh profile, so there is no patch file to edit.",
			errorIoError: "Editing the patch file failed: {detail}"
		};
		const zh = {
			nav: "MCP 服务器",
			title: "MCP 服务器",
			intro: "连接到本 harness 的 Model Context Protocol 服务器。可在此添加或删除服务器；开关用于启用或禁用；重试会重新建立连接。",
			empty: "未配置 MCP 服务器。",
			emptyDesc: "可在此添加，或在配置文件中写入 @deepseek-ai/dsh-mcp-client 条目。",
			loading: "正在加载服务器...",
			error: "加载服务器失败",
			retry: "重试",
			toggling: "切换中...",
			toggled: "服务器已切换",
			retrying: "正在重启...",
			retried: "连接已重启",
			actionFailed: "操作失败",
			statusPending: "等待中",
			statusLoading: "启动中",
			statusActive: "已连接",
			statusFailed: "失败",
			statusUnloading: "停止中",
			statusOff: "已关闭",
			enabledTag: "已启用",
			disabledTag: "已禁用",
			transport: "传输方式",
			module: "模块",
			configHint: "连接设置（命令、URL、参数）请在配置文件中编辑。",
			patchHint: "新增的服务器会写入 {path}，harness 会即时重新加载。",
			restartHint: "当前 profile 没有监视其配置文件，因此在此添加或删除的服务器会在 harness 重启后生效。",
			managedTag: "由本面板添加",
			byHandTag: "来自你的配置文件",
			outsideHint: "该条目不在你的配置文件层中（来自组合包补丁或 --patch 覆盖层），请在那里修改。",
			lockedHint: "该记录管理插件加载器本身，无法在此修改。",
			staleHint: "没有任何配置层声明该条目，因此这里无法管理它：通常是服务器启动失败、其记录又被删除后留下的残骸。重启 harness 即可清除，或添加同名服务器后再删除它。",
			snapshotFailed: "无法读取配置文件，因此暂时不能删除服务器。",
			add: "添加服务器",
			addTitle: "添加 MCP 服务器",
			addIntro: "会向你的 profile 补丁写入一条 @deepseek-ai/dsh-mcp-client 记录并即时挂载。",
			adding: "正在添加...",
			added: "已添加服务器：{name}",
			addFailed: "添加服务器失败",
			fieldName: "名称",
			fieldNameHint: "工具名会变成 mcp__<名称>__<工具>。可用字母、数字、下划线或连字符，最多 32 个字符。",
			fieldTransport: "传输方式",
			transportStdio: "stdio",
			transportHttp: "HTTP",
			fieldCommand: "命令",
			fieldCommandHint: "启动服务器的可执行文件。参数不经过 shell 直接传递。",
			fieldArgs: "参数（每行一个）",
			fieldEnv: "环境变量（每行 KEY=VALUE）",
			fieldEnvHint: "空行与以 # 开头的行会被忽略。API 密钥写在这里，例如 EXA_API_KEY=...",
			fieldCwd: "工作目录",
			fieldUrl: "URL",
			fieldHeaders: "请求头（每行 Name: value）",
			fieldHeadersHint: "空行与以 # 开头的行会被忽略。API 密钥写在这里，例如 x-api-key: YOUR_KEY 或 Authorization: Bearer YOUR_KEY。",
			fieldSecretNotice: "请求头与环境变量的值会以明文写入你的配置文件。",
			fieldTimeout: "工具调用超时（毫秒）",
			fieldTimeoutHint: "留空则使用 mcp-client 默认值 60000。",
			fieldFailOnStartup: "首次连接失败时让插件激活失败",
			cancel: "取消",
			save: "添加",
			close: "关闭",
			edit: "编辑",
			editTitle: "编辑 MCP 服务器",
			editIntro: "会把该服务器写回你的配置文件并即时重新挂载。",
			editing: "正在保存...",
			edited: "已更新服务器：{name}",
			editFailed: "更新服务器失败",
			loadingConfig: "正在读取当前设置...",
			handWrittenNote: "该记录是手工编写的。保存会重写它的 config 区块，文件其余内容保持不变。",
			blockedJs: "该记录包含 !!js 表达式，表单会把它们替换为当前值。请在配置文件中手动编辑。",
			blockedConfig: "运行中的条目没有本表单可重写的配置，请在配置文件中手动编辑。",
			remove: "删除",
			removeTitle: "删除 MCP 服务器",
			removeConfirm: "要从 {path} 中删除 {name} 吗？它的记录与启停覆盖都会被删除，文件其余内容保持不变。",
			removing: "正在删除...",
			removed: "已删除服务器：{name}",
			removeFailed: "删除服务器失败",
			problemNameRequired: "必须填写名称。",
			problemNamePattern: "请使用 1-32 个字母、数字、下划线或连字符。",
			problemTransport: "请选择传输方式。",
			problemCommandRequired: "stdio 服务器必须填写命令。",
			problemUrlRequired: "HTTP 服务器必须填写 URL。",
			problemUrlInvalid: "请输入 http:// 或 https:// 开头的 URL。",
			problemControl: "请去掉换行与控制字符。",
			problemTimeout: "请输入 1 以上的整数毫秒值。",
			problemEnvLine: "每行都必须是 KEY=VALUE 形式。",
			problemHeaderLine: "每行都必须是 Name: value 形式。",
			errorDuplicateId: "此 profile 中已存在名为 {id} 的记录。",
			errorDuplicateName: "服务器名称 {name} 已被运行中的服务器占用。",
			errorNotFound: "配置文件里没有名为 {id} 的记录，它可能来自组合包补丁。",
			errorUnsupported: "无法编辑配置文件：{detail}",
			errorAmbiguous: "有多条记录匹配 {id}，请手动编辑配置文件。",
			errorInvalidSpec: "服务器配置被拒绝。",
			errorBadRequest: "Host 无法理解该请求。",
			errorNoProfile: "当前 harness 未运行 dsh profile，没有可编辑的配置文件。",
			errorIoError: "编辑配置文件失败：{detail}"
		};
		//#endregion
		//#region client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.mcp";
		/**
		* Required services: the slot/locale faces plus the mounted Host Remote this
		* section reads and enables through. The host route needs no injected service
		* of its own — it is reached with a plain same-origin fetch.
		*/
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.pluginInventory",
			"remote.pluginManager"
		];
		/**
		* Call this plugin's own host route and read its structured answer.
		* @param method - `GET` for the snapshot, `POST` for a mutation.
		* @param body - the mutation body, absent for `GET`.
		* @returns the host's answer; transport failures become an `io-error` refusal.
		*/
		async function send(method, body) {
			const headers = { accept: "application/json" };
			const init = {
				method,
				headers
			};
			if (body !== void 0) {
				headers["content-type"] = "application/json";
				init.body = JSON.stringify(body);
			}
			let response;
			try {
				response = await fetch(SERVERS_PATH, init);
			} catch (error) {
				return {
					ok: false,
					error: {
						code: "io-error",
						detail: error instanceof Error ? error.message : String(error)
					}
				};
			}
			let parsed;
			try {
				parsed = await response.json();
			} catch {
				return {
					ok: false,
					error: {
						code: "io-error",
						detail: `HTTP ${String(response.status)}`
					}
				};
			}
			if (typeof parsed !== "object" || parsed === null || typeof parsed.ok !== "boolean") return {
				ok: false,
				error: {
					code: "io-error",
					detail: `HTTP ${String(response.status)}`
				}
			};
			return parsed;
		}
		/**
		* Register the MCP Servers section into Settings.
		* @param ctx - browser plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "mcp-settings: dictionaries");
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				list: async () => {
					const result = await ctx.remote.pluginManager.listPlugins();
					if (!result.ok) throw new Error(`pluginManager.listPlugins failed: ${result.error.code}: ${result.error.message}`);
					return result.value;
				},
				setEnabled: async (entryId, enabled) => {
					const result = await ctx.remote.pluginManager.setPluginEnabled(entryId, enabled);
					if (!result.ok) throw new Error(`pluginManager.setPluginEnabled failed: ${result.error.code}: ${result.error.message}`);
				},
				manage: {
					snapshot: () => send("GET"),
					inspect: (id) => send("POST", {
						action: "inspect",
						id
					}),
					add: (draft) => send("POST", {
						action: "add",
						server: draft
					}),
					edit: (id, draft) => send("POST", {
						action: "edit",
						id,
						server: draft
					}),
					remove: (id) => send("POST", {
						action: "remove",
						id
					})
				}
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "mcp-servers",
				order: 25,
				label: () => t("nav"),
				locale: NS,
				inject: injected
			}, McpServersSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
