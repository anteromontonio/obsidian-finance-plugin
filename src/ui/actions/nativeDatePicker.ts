type DatePickerInput = HTMLInputElement & {
	showPicker?: () => void;
};

export function nativeDatePicker(node: DatePickerInput) {
	const openPicker = () => {
		if (node.disabled || node.readOnly || typeof node.showPicker !== 'function') {
			return;
		}

		try {
			node.showPicker();
		} catch {
			// Some environments only allow this from direct user gestures.
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			openPicker();
		}
	};

	node.addEventListener('click', openPicker);
	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('click', openPicker);
			node.removeEventListener('keydown', handleKeydown);
		},
	};
}
