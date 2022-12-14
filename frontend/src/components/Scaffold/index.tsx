import classes from './style.module.scss';
import surrealistLogo from '~/assets/icon.png';
import { Box, Button, Center, Group, Image, Modal, Paper, Stack, Text, TextInput, Title, useMantineTheme } from "@mantine/core";
import { Spacer } from "./Spacer";
import { PanelSplitter } from '../PanelSplitter';
import { actions, store, useStoreValue } from '~/store';
import { useStable } from '~/hooks/stable';
import { uid } from 'radash';
import { MouseEvent, useState } from 'react';
import { updateConfig, updateTitle } from '~/util/helpers';
import { TabBar } from '../TabBar';
import { Form } from '../Form';
import { useImmer } from 'use-immer';
import { createSurreal, SurrealConnection, SurrealHandle } from '~/surreal';
import { QueryPane } from '../QueryPane';
import { useActiveTab } from '~/hooks/tab';
import { ResultPane } from '../ResultPane';
import { showNotification } from '@mantine/notifications';
import { VariablesPane } from '../VariablesPane';
import { SplitDirection } from '@devbookhq/splitter';
import { useIsLight } from '~/hooks/theme';

export function Scaffold() {
	const isLight = useIsLight();
	const theme = useMantineTheme();
	const activeTab = useStoreValue(state => state.activeTab);
	const tabList = useStoreValue(state => state.knownTabs);
	const tabInfo = useActiveTab();

	const [isOnline, setIsOnline] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [surreal, setSurreal] = useState<SurrealHandle | null>();

	const createNewTab = useStable(() => {
		const tabId = uid(5);

		store.dispatch(actions.addTab({
			id: tabId,
			name: `Tab ${tabList.length + 1}`,
			query: '',
			variables: '{}',
			lastResponse: [],
			connection: {
				endpoint: 'http://localhost:8000/',
				username: 'root',
				password: 'root',
				namespace: '',
				database: ''
			}
		}));

		store.dispatch(actions.setActiveTab(tabId));

		updateTitle();
		updateConfig();
	});

	const [ editingInfo, setEditingInfo ] = useState(false);
	const [ infoDetails, setInfoDetails ] = useImmer<SurrealConnection>({
		endpoint: '',
		username: '',
		password: '',
		namespace: '',
		database: ''
	});

	const openInfoEditor = useStable(() => {
		setEditingInfo(true);
		setInfoDetails(tabInfo!.connection);
	});

	const closeEditingInfo = useStable(() => {
		setEditingInfo(false);
	});

	const saveInfo = useStable(() => {
		store.dispatch(actions.updateTab({
			id: activeTab!,
			connection: {
				...infoDetails
			}
		}));

		if (isOnline) {
			surreal?.close();
		}

		updateConfig();
		closeEditingInfo();
	});

	const openConnection = useStable((e: MouseEvent) => {
		e.stopPropagation();

		if (isConnecting) {
			return;
		}

		const activeTab = store.getState().activeTab;
		const tabInfo = store.getState().knownTabs.find(tab => tab.id === activeTab);

		if (!tabInfo) {
			return;
		}

		const conn = createSurreal({
			connection: tabInfo.connection,
			onConnect() {
				setIsConnecting(false);
				setIsOnline(true)
			},
			onDisconnect() {
				setIsConnecting(false);
				setIsOnline(false)
			},
			onError(code, message) {
				if (code === 1005) {
					return; // Client closed connection
				}

				const reason = `${message || 'Unknown reason'} (${code})`;

				showNotification({
					disallowClose: true,
					color: 'red.4',
					bg: 'red.6',
					message: (
						<div>
							<Text color="white" weight={600}>Connection Closed</Text>
							<Text color="white" opacity={0.8} size="sm">{reason}</Text>
						</div>
					)
				});
			},
		})

		setIsConnecting(true);
		setSurreal(conn);
	});

	const sendQuery = useStable(async (e?: MouseEvent) => {
		e?.stopPropagation();

		if (!isOnline) {
			showNotification({
				message: 'You must be connected to send a query',
			});
			return;
		}

		const query = tabInfo!.query;
		const variables = tabInfo!.variables ? JSON.parse(tabInfo!.variables) : undefined;
		const response = await surreal!.query(query, variables);

		store.dispatch(actions.updateTab({
			id: activeTab!,
			lastResponse: response
		}));

		updateConfig();
	});

	const closeConnection = useStable(() => {
		surreal?.close();
		setIsConnecting(false);
		setIsOnline(false);
	});

	const borderColor = theme.fn.themeColor(isOnline ? 'surreal' : 'light');

	return (
		<div className={classes.root}>
			<TabBar
				onCreateTab={createNewTab}
				onSwitchTab={closeConnection}
			/>

			{activeTab ? (
				<>
					<Group p="xs">
						<Image
							style={{ pointerEvents: 'none', userSelect: 'none' }}
							src={surrealistLogo}
							width={42}
						/>

						<Paper
							className={classes.input}
							onClick={openInfoEditor}
							style={{ borderColor: borderColor }}
						>
							{!isOnline ? (
								<Paper
									bg="light"
									px="xs"
								>
									<Text
										color="white"
										size="xs"
										py={2}
										weight={600}
									>
										OFFLINE
									</Text>
								</Paper>
							) : (
								<Paper
									bg={isLight ? 'light.0' : 'light.6'}
									c={isLight ? 'light.6' : 'white'}
									px="xs"
								>
									{tabInfo!.connection.username}
								</Paper>
							)}
							<Text color={isLight ? 'light.6' : 'white'}>
								{tabInfo!.connection.endpoint}
							</Text>
							<Spacer />
							{isOnline ? (
								<Button
									color="surreal"
									style={{ borderRadius: 0 }}
									onClick={sendQuery}
									title="Send Query (Ctrl+Enter)"
								>
									Send Query
								</Button>
							) : (
								<Button
									color="light"
									style={{ borderRadius: 0 }}
									onClick={openConnection}
								>
									{isConnecting ? 'Connecting...' : 'Connect'}
								</Button>
							)}
						</Paper>
					</Group>

					<Box p="xs" className={classes.content}>
						<PanelSplitter>
							<PanelSplitter
								direction={SplitDirection.Vertical}
								initialSizes={[120]}
							>
								<QueryPane
									onExecuteQuery={sendQuery}
								/>
								<VariablesPane />
							</PanelSplitter>
							<ResultPane />
						</PanelSplitter>
					</Box>
				</>
			) : (
				<Center h="100%">
					<div>
						<Image
							className={classes.emptyImage}
							src={surrealistLogo}
							width={120}
							mx="auto"
						/>
						<Title color="light" align="center" mt="md">
							Surrealist
						</Title>
						<Text color="light.2" align="center">
							Open or create a new tab to continue
						</Text>
						<Center mt="lg">
							<Button size="xs" onClick={createNewTab}>
								Create tab
							</Button>
						</Center>
					</div>
				</Center>
			)}

			{/* ANCHOR Connection details modal */}
			<Modal
				opened={!!editingInfo}
				onClose={closeEditingInfo}
				title={
					<Title size={16} color={isLight ? 'light.6' : 'white'}>
						Connection details
					</Title>
				}
			>
				<Form onSubmit={saveInfo}>
					<Stack>
						<TextInput
							style={{ flex: 1 }}
							label="Endpoint URL"
							value={infoDetails.endpoint}
							onChange={(e) => setInfoDetails(draft => {
								draft.endpoint = e.target.value
							})}
							autoFocus
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Username"
							value={infoDetails.username}
							onChange={(e) => setInfoDetails(draft => {
								draft.username = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Password"
							value={infoDetails.password}
							onChange={(e) => setInfoDetails(draft => {
								draft.password = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Namespace (optional)"
							value={infoDetails.namespace}
							onChange={(e) => setInfoDetails(draft => {
								draft.namespace = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Database (optional)"
							value={infoDetails.database}
							onChange={(e) => setInfoDetails(draft => {
								draft.database = e.target.value
							})}
						/>
						<Group>
							<Button color="light" onClick={closeEditingInfo}>
								Close
							</Button>
							<Spacer />
							<Button type="submit">
								Save
							</Button>
						</Group>
					</Stack>
				</Form>
			</Modal>
		</div>
	)
}