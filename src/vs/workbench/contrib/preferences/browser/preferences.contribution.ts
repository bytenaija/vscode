/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { Disposable } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import 'vs/css!../browser/media/preferences';
import { Context as SuggestContext } from 'vs/editor/contrib/suggest/suggest';
import * as nls from 'vs/nls';
import { Action2, MenuId, MenuRegistry, registerAction2, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { ILabelService } from 'vs/platform/label/common/label';
import { LifecyclePhase } from 'vs/platform/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { REMOTE_HOST_SCHEME } from 'vs/platform/remote/common/remoteHosts';
import { IWorkspaceContextService, WorkbenchState } from 'vs/platform/workspace/common/workspace';
import { RemoteNameContext, WorkbenchStateContext } from 'vs/workbench/browser/contextkeys';
import { IsMacNativeContext } from 'vs/platform/contextkey/common/contextkeys';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { Extensions, IWorkbenchActionRegistry } from 'vs/workbench/common/actions';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { EditorInput, Extensions as EditorInputExtensions, IEditorInputFactory, IEditorInputFactoryRegistry } from 'vs/workbench/common/editor';
import { ResourceContextKey } from 'vs/workbench/common/resources';
import { ExplorerFolderContext, ExplorerRootContext } from 'vs/workbench/contrib/files/common/files';
import { KeybindingsEditor } from 'vs/workbench/contrib/preferences/browser/keybindingsEditor';
import { ConfigureLanguageBasedSettingsAction, OpenDefaultKeybindingsFileAction, OpenFolderSettingsAction, OpenGlobalKeybindingsAction, OpenGlobalKeybindingsFileAction, OpenGlobalSettingsAction, OpenRawDefaultSettingsAction, OpenRemoteSettingsAction, OpenSettings2Action, OpenSettingsJsonAction, OpenWorkspaceSettingsAction, OPEN_FOLDER_SETTINGS_COMMAND, OPEN_FOLDER_SETTINGS_LABEL } from 'vs/workbench/contrib/preferences/browser/preferencesActions';
import { PreferencesEditor } from 'vs/workbench/contrib/preferences/browser/preferencesEditor';
import { SettingsEditor2 } from 'vs/workbench/contrib/preferences/browser/settingsEditor2';
import { CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, CONTEXT_KEYBINDING_FOCUS, CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR, CONTEXT_SETTINGS_SEARCH_FOCUS, CONTEXT_TOC_ROW_FOCUS, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_SEARCH, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS, KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS, MODIFIED_SETTING_TAG, SETTINGS_COMMAND_OPEN_SETTINGS, SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, SETTINGS_EDITOR_COMMAND_EDIT_FOCUSED_SETTING, SETTINGS_EDITOR_COMMAND_FILTER_MODIFIED, SETTINGS_EDITOR_COMMAND_FILTER_ONLINE, SETTINGS_EDITOR_COMMAND_FOCUS_FILE, SETTINGS_EDITOR_COMMAND_FOCUS_NEXT_SETTING, SETTINGS_EDITOR_COMMAND_FOCUS_PREVIOUS_SETTING, SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH, SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST, SETTINGS_EDITOR_COMMAND_SEARCH, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU, SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON, SETTINGS_EDITOR_COMMAND_FOCUS_TOC } from 'vs/workbench/contrib/preferences/common/preferences';
import { PreferencesContribution } from 'vs/workbench/contrib/preferences/common/preferencesContribution';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { DefaultPreferencesEditorInput, KeybindingsEditorInput, PreferencesEditorInput, SettingsEditor2Input } from 'vs/workbench/services/preferences/common/preferencesEditorInput';

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		PreferencesEditor,
		PreferencesEditor.ID,
		nls.localize('defaultPreferencesEditor', "Default Preferences Editor")
	),
	[
		new SyncDescriptor(PreferencesEditorInput)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		SettingsEditor2,
		SettingsEditor2.ID,
		nls.localize('settingsEditor2', "Settings Editor 2")
	),
	[
		new SyncDescriptor(SettingsEditor2Input)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		KeybindingsEditor,
		KeybindingsEditor.ID,
		nls.localize('keybindingsEditor', "Keybindings Editor")
	),
	[
		new SyncDescriptor(KeybindingsEditorInput)
	]
);

interface ISerializedPreferencesEditorInput {
	name: string;
	description: string;

	detailsSerialized: string;
	masterSerialized: string;

	detailsTypeId: string;
	masterTypeId: string;
}

// Register Preferences Editor Input Factory
class PreferencesEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): boolean {
		const input = <PreferencesEditorInput>editorInput;

		if (input.details && input.master) {
			const registry = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories);
			const detailsInputFactory = registry.getEditorInputFactory(input.details.getTypeId());
			const masterInputFactory = registry.getEditorInputFactory(input.master.getTypeId());

			return !!(detailsInputFactory?.canSerialize(input.details) && masterInputFactory?.canSerialize(input.master));
		}

		return false;
	}

	serialize(editorInput: EditorInput): string | undefined {
		const input = <PreferencesEditorInput>editorInput;

		if (input.details && input.master) {
			const registry = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories);
			const detailsInputFactory = registry.getEditorInputFactory(input.details.getTypeId());
			const masterInputFactory = registry.getEditorInputFactory(input.master.getTypeId());

			if (detailsInputFactory && masterInputFactory) {
				const detailsSerialized = detailsInputFactory.serialize(input.details);
				const masterSerialized = masterInputFactory.serialize(input.master);

				if (detailsSerialized && masterSerialized) {
					return JSON.stringify(<ISerializedPreferencesEditorInput>{
						name: input.getName(),
						description: input.getDescription(),
						detailsSerialized,
						masterSerialized,
						detailsTypeId: input.details.getTypeId(),
						masterTypeId: input.master.getTypeId()
					});
				}
			}
		}

		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput | undefined {
		const deserialized: ISerializedPreferencesEditorInput = JSON.parse(serializedEditorInput);

		const registry = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories);
		const detailsInputFactory = registry.getEditorInputFactory(deserialized.detailsTypeId);
		const masterInputFactory = registry.getEditorInputFactory(deserialized.masterTypeId);

		if (detailsInputFactory && masterInputFactory) {
			const detailsInput = detailsInputFactory.deserialize(instantiationService, deserialized.detailsSerialized);
			const masterInput = masterInputFactory.deserialize(instantiationService, deserialized.masterSerialized);

			if (detailsInput && masterInput) {
				return new PreferencesEditorInput(deserialized.name, deserialized.description, detailsInput, masterInput);
			}
		}

		return undefined;
	}
}

class KeybindingsEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): boolean {
		return true;
	}

	serialize(editorInput: EditorInput): string {
		const input = <KeybindingsEditorInput>editorInput;
		return JSON.stringify({
			name: input.getName(),
			typeId: input.getTypeId()
		});
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
		return instantiationService.createInstance(KeybindingsEditorInput);
	}
}

class SettingsEditor2InputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): boolean {
		return true;
	}

	serialize(input: SettingsEditor2Input): string {
		return '{}';
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): SettingsEditor2Input {
		return instantiationService.createInstance(SettingsEditor2Input);
	}
}

interface ISerializedDefaultPreferencesEditorInput {
	resource: string;
}

// Register Default Preferences Editor Input Factory
class DefaultPreferencesEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): boolean {
		return true;
	}

	serialize(editorInput: EditorInput): string {
		const input = <DefaultPreferencesEditorInput>editorInput;

		const serialized: ISerializedDefaultPreferencesEditorInput = { resource: input.resource.toString() };

		return JSON.stringify(serialized);
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
		const deserialized: ISerializedDefaultPreferencesEditorInput = JSON.parse(serializedEditorInput);

		return instantiationService.createInstance(DefaultPreferencesEditorInput, URI.parse(deserialized.resource));
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(PreferencesEditorInput.ID, PreferencesEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(DefaultPreferencesEditorInput.ID, DefaultPreferencesEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(KeybindingsEditorInput.ID, KeybindingsEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(SettingsEditor2Input.ID, SettingsEditor2InputFactory);

// Contribute Global Actions
const category = nls.localize('preferences', "Preferences");
const registry = Registry.as<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenRawDefaultSettingsAction, OpenRawDefaultSettingsAction.ID, OpenRawDefaultSettingsAction.LABEL), 'Preferences: Open Default Settings (JSON)', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenSettingsJsonAction, OpenSettingsJsonAction.ID, OpenSettingsJsonAction.LABEL), 'Preferences: Open Settings (JSON)', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenSettings2Action, OpenSettings2Action.ID, OpenSettings2Action.LABEL), 'Preferences: Open Settings (UI)', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenGlobalSettingsAction, OpenGlobalSettingsAction.ID, OpenGlobalSettingsAction.LABEL), 'Preferences: Open User Settings', category);

registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenGlobalKeybindingsAction, OpenGlobalKeybindingsAction.ID, OpenGlobalKeybindingsAction.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_S) }), 'Preferences: Open Keyboard Shortcuts', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenDefaultKeybindingsFileAction, OpenDefaultKeybindingsFileAction.ID, OpenDefaultKeybindingsFileAction.LABEL), 'Preferences: Open Default Keyboard Shortcuts (JSON)', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(OpenGlobalKeybindingsFileAction, OpenGlobalKeybindingsFileAction.ID, OpenGlobalKeybindingsFileAction.LABEL, { primary: 0 }), 'Preferences: Open Keyboard Shortcuts (JSON)', category);
registry.registerWorkbenchAction(SyncActionDescriptor.create(ConfigureLanguageBasedSettingsAction, ConfigureLanguageBasedSettingsAction.ID, ConfigureLanguageBasedSettingsAction.LABEL), 'Preferences: Configure Language Specific Settings...', category);

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: SETTINGS_COMMAND_OPEN_SETTINGS,
	weight: KeybindingWeight.WorkbenchContrib,
	when: null,
	primary: KeyMod.CtrlCmd | KeyCode.US_COMMA,
	handler: (accessor, args: string | undefined) => {
		const query = typeof args === 'string' ? args : undefined;
		accessor.get(IPreferencesService).openSettings(query ? false : undefined, query);
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.defineKeybinding(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_E),
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor && editorPane.activeKeybindingEntry!.keybindingItem.keybinding) {
			editorPane.defineWhenExpression(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: KeyCode.Delete,
	mac: {
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.Backspace)
	},
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.removeKeybinding(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_RESET,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: 0,
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.resetKeybinding(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_SEARCH,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
	primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.focusSearch();
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
	primary: KeyMod.Alt | KeyCode.KEY_K,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_K },
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.recordSearchKeys();
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
	primary: KeyMod.Alt | KeyCode.KEY_P,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_P },
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.toggleSortByPrecedence();
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: 0,
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.showSimilarKeybindings(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_COPY,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
	handler: async (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			await editorPane.copyKeybinding(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
	primary: 0,
	handler: async (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			await editorPane.copyKeybindingCommand(editorPane.activeKeybindingEntry!);
		}
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
	primary: KeyCode.DownArrow,
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.focusKeybindings();
		}
	}
});

class PreferencesActionsContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILabelService labelService: ILabelService,
		@IExtensionService extensionService: IExtensionService,
	) {
		super();
		MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
			command: {
				id: OpenGlobalKeybindingsAction.ID,
				title: OpenGlobalKeybindingsAction.LABEL,
				icon: { id: 'codicon/go-to-file' }
			},
			when: ResourceContextKey.Resource.isEqualTo(environmentService.keybindingsResource.toString()),
			group: 'navigation',
			order: 1
		});

		const commandId = '_workbench.openUserSettingsEditor';
		CommandsRegistry.registerCommand(commandId, () => this.preferencesService.openGlobalSettings(false));
		MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
			command: {
				id: commandId,
				title: OpenSettings2Action.LABEL,
				icon: { id: 'codicon/go-to-file' }
			},
			when: ResourceContextKey.Resource.isEqualTo(environmentService.settingsResource.toString()),
			group: 'navigation',
			order: 1
		});

		this.updatePreferencesEditorMenuItem();
		this._register(workspaceContextService.onDidChangeWorkbenchState(() => this.updatePreferencesEditorMenuItem()));
		this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => this.updatePreferencesEditorMenuItemForWorkspaceFolders()));

		extensionService.whenInstalledExtensionsRegistered()
			.then(() => {
				const remoteAuthority = environmentService.configuration.remoteAuthority;
				const hostLabel = labelService.getHostLabel(REMOTE_HOST_SCHEME, remoteAuthority) || remoteAuthority;
				const label = nls.localize('openRemoteSettings', "Open Remote Settings ({0})", hostLabel);
				CommandsRegistry.registerCommand(OpenRemoteSettingsAction.ID, serviceAccessor => {
					serviceAccessor.get(IInstantiationService).createInstance(OpenRemoteSettingsAction, OpenRemoteSettingsAction.ID, label).run();
				});
				MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
					command: {
						id: OpenRemoteSettingsAction.ID,
						title: { value: label, original: `Open Remote Settings (${hostLabel})` },
						category: { value: nls.localize('preferencesCategory', "Preferences"), original: 'Preferences' }
					},
					when: RemoteNameContext.notEqualsTo('')
				});
			});
	}

	private updatePreferencesEditorMenuItem() {
		const commandId = '_workbench.openWorkspaceSettingsEditor';
		if (this.workspaceContextService.getWorkbenchState() === WorkbenchState.WORKSPACE && !CommandsRegistry.getCommand(commandId)) {
			CommandsRegistry.registerCommand(commandId, () => this.preferencesService.openWorkspaceSettings(false));
			MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
				command: {
					id: commandId,
					title: OpenSettings2Action.LABEL,
					icon: { id: 'codicon/go-to-file' }
				},
				when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.workspaceSettingsResource!.toString()), WorkbenchStateContext.isEqualTo('workspace')),
				group: 'navigation',
				order: 1
			});
		}
		this.updatePreferencesEditorMenuItemForWorkspaceFolders();
	}

	private updatePreferencesEditorMenuItemForWorkspaceFolders() {
		for (const folder of this.workspaceContextService.getWorkspace().folders) {
			const commandId = `_workbench.openFolderSettings.${folder.uri.toString()}`;
			if (!CommandsRegistry.getCommand(commandId)) {
				CommandsRegistry.registerCommand(commandId, () => {
					if (this.workspaceContextService.getWorkbenchState() === WorkbenchState.FOLDER) {
						return this.preferencesService.openWorkspaceSettings(false);
					} else {
						return this.preferencesService.openFolderSettings(folder.uri, false);
					}
				});
				MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
					command: {
						id: commandId,
						title: OpenSettings2Action.LABEL,
						icon: { id: 'codicon/go-to-file' }
					},
					when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.getFolderSettingsResource(folder.uri)!.toString())),
					group: 'navigation',
					order: 1
				});
			}
		}
	}
}

const workbenchContributionsRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(PreferencesActionsContribution, LifecyclePhase.Starting);
workbenchContributionsRegistry.registerWorkbenchContribution(PreferencesContribution, LifecyclePhase.Starting);

CommandsRegistry.registerCommand(OPEN_FOLDER_SETTINGS_COMMAND, function (accessor: ServicesAccessor, resource: URI) {
	const preferencesService = accessor.get(IPreferencesService);
	return preferencesService.openFolderSettings(resource);
});

CommandsRegistry.registerCommand(OpenFolderSettingsAction.ID, serviceAccessor => {
	serviceAccessor.get(IInstantiationService).createInstance(OpenFolderSettingsAction, OpenFolderSettingsAction.ID, OpenFolderSettingsAction.LABEL).run();
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: OpenFolderSettingsAction.ID,
		title: { value: OpenFolderSettingsAction.LABEL, original: 'Open Folder Settings' },
		category: { value: nls.localize('preferencesCategory', "Preferences"), original: 'Preferences' }
	},
	when: WorkbenchStateContext.isEqualTo('workspace')
});

CommandsRegistry.registerCommand(OpenWorkspaceSettingsAction.ID, serviceAccessor => {
	serviceAccessor.get(IInstantiationService).createInstance(OpenWorkspaceSettingsAction, OpenWorkspaceSettingsAction.ID, OpenWorkspaceSettingsAction.LABEL).run();
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: OpenWorkspaceSettingsAction.ID,
		title: { value: OpenWorkspaceSettingsAction.LABEL, original: 'Open Workspace Settings' },
		category: { value: nls.localize('preferencesCategory', "Preferences"), original: 'Preferences' }
	},
	when: WorkbenchStateContext.notEqualsTo('empty')
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
	primary: KeyCode.Escape,
	handler: (accessor, args: any) => {
		const editorPane = accessor.get(IEditorService).activeEditorPane;
		if (editorPane instanceof KeybindingsEditor) {
			editorPane.clearSearchResults();
		}
	}
});

CommandsRegistry.registerCommand(OpenGlobalKeybindingsFileAction.ID, serviceAccessor => {
	serviceAccessor.get(IInstantiationService).createInstance(OpenGlobalKeybindingsFileAction, OpenGlobalKeybindingsFileAction.ID, OpenGlobalKeybindingsFileAction.LABEL).run();
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: OpenGlobalKeybindingsFileAction.ID,
		title: OpenGlobalKeybindingsFileAction.LABEL,
		icon: { id: 'codicon/go-to-file' }
	},
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
	group: 'navigation',
});

CommandsRegistry.registerCommand(KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS, serviceAccessor => {
	const editorPane = serviceAccessor.get(IEditorService).activeEditorPane;
	if (editorPane instanceof KeybindingsEditor) {
		editorPane.search('@source:default');
	}
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS,
		title: nls.localize('showDefaultKeybindings', "Show Default Keybindings")
	},
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
	group: '1_keyboard_preferences_actions'
});

CommandsRegistry.registerCommand(KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS, serviceAccessor => {
	const editorPane = serviceAccessor.get(IEditorService).activeEditorPane;
	if (editorPane instanceof KeybindingsEditor) {
		editorPane.search('@source:user');
	}
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS,
		title: nls.localize('showUserKeybindings', "Show User Keybindings")
	},
	when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
	group: '1_keyboard_preferences_actions'
});

function getPreferencesEditor(accessor: ServicesAccessor): PreferencesEditor | SettingsEditor2 | null {
	const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
	if (activeEditorPane instanceof PreferencesEditor || activeEditorPane instanceof SettingsEditor2) {
		return activeEditorPane;
	}

	return null;
}

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_SEARCH,
			precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR),
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.focusSearch', "Focus settings search")
		});
	}

	run(accessor: ServicesAccessor) {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor) {
			preferencesEditor.focusSearch();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
			precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
			keybinding: {
				primary: KeyCode.Escape,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.clearResults', "Clear settings search results")
		});
	}

	run(accessor: ServicesAccessor) {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor) {
			preferencesEditor.clearSearchResults();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_FILE,
			precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.Visible.toNegated()),
			keybinding: {
				primary: KeyCode.DownArrow,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.focusFile', "Focus settings file")
		});
	}

	run(accessor: ServicesAccessor, args: any): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof PreferencesEditor) {
			preferencesEditor.focusSettingsFileEditor();
		} else if (preferencesEditor) {
			preferencesEditor.focusSettings();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH,
			precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.Visible.toNegated()),
			keybinding: {
				primary: KeyCode.DownArrow,
				weight: KeybindingWeight.WorkbenchContrib,
				when: null
			},
			title: nls.localize('settings.focusFile', "Focus settings file")
		});
	}

	run(accessor: ServicesAccessor, args: any): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof PreferencesEditor) {
			preferencesEditor.focusSettingsFileEditor();
		} else if (preferencesEditor) {
			preferencesEditor.focusSettings();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_NEXT_SETTING,
			precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
			keybinding: {
				primary: KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.focusNextSetting', "Focus next setting")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof PreferencesEditor) {
			preferencesEditor.focusNextResult();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_PREVIOUS_SETTING,
			precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
			keybinding: {
				primary: KeyMod.Shift | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.focusPreviousSetting', "Focus previous setting")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof PreferencesEditor) {
			preferencesEditor.focusPreviousResult();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_EDIT_FOCUSED_SETTING,
			precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyCode.US_DOT,
				weight: KeybindingWeight.EditorContrib,
				when: null
			},
			title: nls.localize('settings.editFocusedSetting', "Edit focused setting")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof PreferencesEditor) {
			preferencesEditor.editFocusedPreference();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST,
			precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_TOC_ROW_FOCUS),
			keybinding: {
				primary: KeyCode.Enter,
				weight: KeybindingWeight.WorkbenchContrib,
				when: null
			},
			title: nls.localize('settings.focusSettingsList', "Focus settings list")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof SettingsEditor2) {
			preferencesEditor.focusSettings();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_FOCUS_TOC,
			precondition: CONTEXT_SETTINGS_EDITOR,
			title: nls.localize('settings.focusSettingsTOC', "Focus settings TOC tree")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof SettingsEditor2) {
			preferencesEditor.focusTOC();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU,
			precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR),
			keybinding: {
				primary: KeyMod.Shift | KeyCode.F9,
				weight: KeybindingWeight.WorkbenchContrib,
				when: null
			},
			title: nls.localize('settings.showContextMenu', "Show context menu")
		});
	}

	run(accessor: ServicesAccessor): void {
		const preferencesEditor = getPreferencesEditor(accessor);
		if (preferencesEditor instanceof SettingsEditor2) {
			preferencesEditor.showContextMenu();
		}
	}
});

CommandsRegistry.registerCommand(SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON, serviceAccessor => {
	const editorPane = serviceAccessor.get(IEditorService).activeEditorPane;
	if (editorPane instanceof SettingsEditor2) {
		return editorPane.switchToSettingsFile();
	}

	return Promise.resolve(null);
});

CommandsRegistry.registerCommand(SETTINGS_EDITOR_COMMAND_FILTER_MODIFIED, serviceAccessor => {
	const editorPane = serviceAccessor.get(IEditorService).activeEditorPane;
	if (editorPane instanceof SettingsEditor2) {
		editorPane.focusSearch(`@${MODIFIED_SETTING_TAG}`);
	}
});

CommandsRegistry.registerCommand(SETTINGS_EDITOR_COMMAND_FILTER_ONLINE, serviceAccessor => {
	const editorPane = serviceAccessor.get(IEditorService).activeEditorPane;
	if (editorPane instanceof SettingsEditor2) {
		editorPane.focusSearch(`@tag:usesOnlineServices`);
	} else {
		serviceAccessor.get(IPreferencesService).openSettings(false, '@tag:usesOnlineServices');
	}
});

// Preferences menu

MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
	title: nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, "&&Preferences"),
	submenu: MenuId.MenubarPreferencesMenu,
	group: '5_autosave',
	order: 2,
	when: IsMacNativeContext.toNegated() // on macOS native the preferences menu is separate under the application menu
});

MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
	group: '1_settings',
	command: {
		id: SETTINGS_COMMAND_OPEN_SETTINGS,
		title: nls.localize({ key: 'miOpenSettings', comment: ['&& denotes a mnemonic'] }, "&&Settings")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
	group: '2_configuration',
	command: {
		id: SETTINGS_COMMAND_OPEN_SETTINGS,
		title: nls.localize('settings', "Settings")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
	group: '1_settings',
	command: {
		id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
		title: nls.localize({ key: 'miOpenOnlineSettings', comment: ['&& denotes a mnemonic'] }, "&&Online Services Settings")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
	group: '2_configuration',
	command: {
		id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
		title: nls.localize('onlineServices', "Online Services Settings")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
	group: '2_keybindings',
	command: {
		id: OpenGlobalKeybindingsAction.ID,
		title: nls.localize({ key: 'miOpenKeymap', comment: ['&& denotes a mnemonic'] }, "&&Keyboard Shortcuts")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
	group: '2_keybindings',
	command: {
		id: OpenGlobalKeybindingsAction.ID,
		title: nls.localize('keyboardShortcuts', "Keyboard Shortcuts")
	},
	order: 1
});

// Editor tool items

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON,
		title: nls.localize('openSettingsJson', "Open Settings (JSON)"),
		icon: { id: 'codicon/go-to-file' }
	},
	group: 'navigation',
	order: 1,
	when: ContextKeyExpr.and(
		CONTEXT_SETTINGS_EDITOR,
		CONTEXT_SETTINGS_JSON_EDITOR.toNegated()
	)
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: SETTINGS_EDITOR_COMMAND_FILTER_MODIFIED,
		title: nls.localize('filterModifiedLabel', "Show modified settings")
	},
	group: '1_filter',
	order: 1,
	when: ContextKeyExpr.and(
		CONTEXT_SETTINGS_EDITOR,
		CONTEXT_SETTINGS_JSON_EDITOR.toNegated()
	)
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
		title: nls.localize('filterOnlineServicesLabel', "Show settings for online services"),
	},
	group: '1_filter',
	order: 2,
	when: ContextKeyExpr.and(
		CONTEXT_SETTINGS_EDITOR,
		CONTEXT_SETTINGS_JSON_EDITOR.toNegated()
	)
});

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '2_workspace',
	order: 20,
	command: {
		id: OPEN_FOLDER_SETTINGS_COMMAND,
		title: OPEN_FOLDER_SETTINGS_LABEL
	},
	when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext)
});
