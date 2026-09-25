window.__ModuleLoader__.load({
	id: "dsh-plugin-mcp-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var css = ".tyr3ha_section {\n  max-width: 760px;\n  color: var(--dsw-alias-label-primary);\n  flex-direction: column;\n  gap: 12px;\n  display: flex;\n}\n\n.tyr3ha_heading {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n}\n\n.tyr3ha_intro {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 0;\n  font-size: 13px;\n}\n\n.tyr3ha_hint {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 0;\n  font-size: 12px;\n}\n\n.tyr3ha_notice {\n  color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary));\n  margin: 0;\n  font-size: 12px;\n}\n\n.tyr3ha_failure {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  display: flex;\n}\n\n.tyr3ha_failure span {\n  overflow-wrap: anywhere;\n  flex: 1;\n  min-width: 0;\n}\n\n.tyr3ha_empty {\n  text-align: center;\n  border: 1px dashed var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  gap: 6px;\n  padding: 40px 24px;\n  font-size: 13px;\n  display: flex;\n}\n\n.tyr3ha_cards {\n  flex-direction: column;\n  gap: 8px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n}\n\n.tyr3ha_card {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-l1);\n  border-radius: 10px;\n}\n\n.tyr3ha_card[data-phase=\"failed\"] {\n  border-color: var(--dsw-alias-border-l3);\n}\n\n.tyr3ha_cardMain {\n  grid-template-columns: minmax(0, 1fr) auto auto;\n  align-items: center;\n  gap: 16px;\n  padding: 10px 14px;\n  display: grid;\n}\n\n.tyr3ha_cardText {\n  flex-direction: column;\n  gap: 2px;\n  min-width: 0;\n  display: flex;\n}\n\n.tyr3ha_cardTitle {\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 14px;\n  font-weight: 500;\n  overflow: hidden;\n}\n\n.tyr3ha_cardModule {\n  color: var(--dsw-alias-label-tertiary);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 11px;\n  overflow: hidden;\n}\n\n.tyr3ha_cardStatus {\n  justify-content: flex-end;\n  align-items: center;\n  gap: 8px;\n  display: flex;\n}\n\n.tyr3ha_phase {\n  display: inline-flex;\n}\n\n.tyr3ha_phaseLabel {\n  color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary));\n  white-space: nowrap;\n  font-size: 12px;\n}\n\n.tyr3ha_cardControls {\n  align-items: center;\n  gap: 10px;\n  display: flex;\n}\n\n@media (width <= 640px) {\n  .tyr3ha_cardMain {\n    grid-template-columns: 1fr;\n    gap: 8px;\n  }\n\n  .tyr3ha_cardStatus {\n    justify-content: flex-start;\n  }\n}\n";
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
		//#region client/McpServersSection.module.css
		var McpServersSection_module_default = {
			"card": "tyr3ha_card",
			"cardControls": "tyr3ha_cardControls",
			"cardMain": "tyr3ha_cardMain",
			"cardModule": "tyr3ha_cardModule",
			"cards": "tyr3ha_cards",
			"cardStatus": "tyr3ha_cardStatus",
			"cardText": "tyr3ha_cardText",
			"cardTitle": "tyr3ha_cardTitle",
			"empty": "tyr3ha_empty",
			"failure": "tyr3ha_failure",
			"heading": "tyr3ha_heading",
			"hint": "tyr3ha_hint",
			"intro": "tyr3ha_intro",
			"notice": "tyr3ha_notice",
			"phase": "tyr3ha_phase",
			"phaseLabel": "tyr3ha_phaseLabel",
			"section": "tyr3ha_section"
		};
		//#endregion
		//#region client/McpServersSection.tsx
		/**
		* MCP Servers settings section: one card per `@deepseek-ai/dsh-mcp-client`
		* Loader entry, with a live phase dot, an enable/disable switch, and a retry
		* action that restarts the entry (disable → enable), which re-establishes the
		* MCP connection. Data comes from the mounted `pluginManager` Remote — its
		* `listPlugins` carries the same inventory facts plus each row's patch
		* addressability, and `setPluginEnabled` persists the switch and reloads the
		* entry live.
		*/
		/** The Loader module every MCP server row runs. */
		const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
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
		function rowView(entry, t) {
			if (!entry.enabled) return {
				entry,
				dot: "idle",
				label: t("statusOff"),
				tone: "neutral",
				tag: t("disabled")
			};
			const phase = entry.fiberPhase;
			return {
				entry,
				dot: phase === null ? "idle" : PHASE_DOT[phase],
				label: phase === null ? t("statusPending") : t(PHASE_KEY[phase]),
				tone: phase === "failed" ? "danger" : "success",
				tag: t("enabled")
			};
		}
		/** Display name for one server row: the patch entry id, without its `include:` marker. */
		function displayName(entry) {
			return entry.entryId.replace(/^include:/, "");
		}
		/** Render the MCP Servers section. */
		function McpServersSection({ t, list, setEnabled }) {
			const [view, setView] = (0, react.useState)({ status: "loading" });
			const [busyIds, setBusyIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [actionError, setActionError] = (0, react.useState)();
			const [notice, setNotice] = (0, react.useState)();
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
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					current = false;
				};
			}, [list]);
			const reload = () => {
				list().then((snapshot) => {
					setView({
						status: "ready",
						servers: snapshot.filter((row) => row.moduleName === MCP_CLIENT_MODULE)
					});
				}, (error) => {
					setView({
						status: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
			};
			const run = async (entry, action, busyLabel, done) => {
				setBusyIds((previous) => new Set([...previous, entry.entryId]));
				setActionError(void 0);
				setNotice(busyLabel);
				try {
					await action(entry.entryId);
					setNotice(done);
					reload();
				} catch (error) {
					setActionError(`${t("actionFailed")}: ${error instanceof Error ? error.message : String(error)}`);
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
			if (view.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					})
				]
			});
			const servers = view.servers;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: McpServersSection_module_default.card,
								"data-phase": entry.fiberPhase ?? "off",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: McpServersSection_module_default.cardMain,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: McpServersSection_module_default.cardText,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: McpServersSection_module_default.cardTitle,
												children: displayName(entry)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: McpServersSection_module_default.cardModule,
												children: entry.moduleName
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
											children: [!locked && entry.enabled && entry.fiberPhase !== "loading" && entry.fiberPhase !== "unloading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												disabled: busy,
												onClick: () => {
													retry(entry);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineMedium, {
													size: 14,
													"aria-hidden": "true"
												}), busy ? t("retrying") : t("retry")]
											}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
												checked: entry.enabled,
												disabled: busy || locked,
												label: `${displayName(entry)}: ${row.tag}`,
												onChange: () => {
													toggle(entry);
												}
											})]
										})
									]
								}), locked && entry.readOnlyReason !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: McpServersSection_module_default.hint,
									children: entry.readOnlyReason
								}) : null]
							}, entry.entryId);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: McpServersSection_module_default.hint,
						children: t("configHint")
					})
				]
			});
		}
		//#endregion
		//#region client/locales.ts
		/** Dictionary for the MCP Servers settings section (en + zh). */
		const en = {
			nav: "MCP Servers",
			title: "MCP Servers",
			intro: "Model Context Protocol servers connected to this harness. Toggle a server to enable or disable it; retry restarts its connection.",
			empty: "No MCP servers configured.",
			emptyDesc: "Add @deepseek-ai/dsh-mcp-client entries in the profile configuration file.",
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
			transport: "Transport",
			module: "Module",
			configHint: "Connection settings (command, URL, arguments) are edited in the configuration file."
		};
		const zh = {
			nav: "MCP 服务器",
			title: "MCP 服务器",
			intro: "连接到本 harness 的 Model Context Protocol 服务器。开关用于启用或禁用服务器；重试会重新建立连接。",
			empty: "未配置 MCP 服务器。",
			emptyDesc: "请在配置文件中添加 @deepseek-ai/dsh-mcp-client 条目。",
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
			transport: "传输方式",
			module: "模块",
			configHint: "连接设置（命令、URL、参数）请在配置文件中编辑。"
		};
		//#endregion
		//#region client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.mcp";
		/**
		* Required services: the slot/locale faces plus the two mounted Host Remotes
		* this section reads and writes through.
		*/
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.pluginInventory",
			"remote.pluginManager"
		];
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
